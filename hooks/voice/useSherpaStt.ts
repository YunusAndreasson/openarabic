/**
 * NVIDIA Parakeet TDT transducer 110M (English, int8) wrapper. Downloads the
 * model on first `enabled` flip (~103 MB), surfaces progress for the Settings
 * screen, then exposes a `transcribe(Float32Array) → string | null` for the
 * review flow.
 *
 * Ported from edemind's use-sherpa-stt.ts.
 */
import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// NOTE: `react-native-sherpa-onnx/download` imports `@dr.pogodin/react-native-fs`
// internally (lib/module/download/validation.js) but does not depend on it, so we
// must declare it in package.json even though nothing here imports it directly.
// Removing it as "unused" breaks the Metro bundle with "Unable to resolve module
// @dr.pogodin/react-native-fs" the moment this module is reached. `yarn check-unused`
// (knip) does resolve through node_modules and sees the import, so it will catch the
// mistake — a plain grep over app source will not.
import {
  ModelCategory,
  ensureModelByCategory,
  refreshModelsByCategory,
  type DownloadProgress,
} from 'react-native-sherpa-onnx/download';
import { createSTT, type STTModelType, type SttEngine } from 'react-native-sherpa-onnx/stt';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TARGET_SAMPLE_RATE } from '@/lib/voice/recording';
import { analytics } from '@/services/analytics';
import { span as diagSpan } from '@/utils/reviewDiagnostics';
import { voiceBreadcrumb } from '@/utils/errorHandling';

/**
 * NVIDIA Parakeet TDT transducer 110M (English, int8) — ~103 MB.
 *
 * Was the 0.6B v2 int8 at ~460 MB. Field telemetry
 * (`voice_grading_attempts`, 80 resolved attempts) showed transcription is not
 * the constraint: exactly one attempt was a genuine mishear the learner had to
 * override, and the misses that mattered were a wrong-answer matcher and glosses
 * the normalizer had mangled — neither of which a bigger acoustic model fixes.
 * So the 4.5× download was buying headroom the feature never used, on an
 * opt-in feature where that download is the gate people actually bounce off.
 *
 * Same `nemo_transducer` architecture, so decoding config carries over
 * unchanged. `model_id` is recorded on every attempt, so the accuracy of this
 * swap is measurable against the 0.6B baseline already in the table.
 */
export const PARAKEET_MODEL_ID = 'sherpa-onnx-nemo-parakeet_tdt_transducer_110m-en-36000-int8';

/**
 * Decoding is greedy, and nothing here can change that.
 *
 * This file used to call `engine.setConfig({ decodingMethod: 'modified_beam_search' })`
 * after load, on the theory that a small beam keeps a rarer-but-correct hypothesis
 * alive on one-word audio. It never took effect for a single attempt. sherpa-onnx
 * picks the decoder ONCE, in the `OfflineRecognizerTransducerNeMoImpl` constructor,
 * from `config.decoding_method`. `OfflineRecognizerImpl::SetConfig` is only
 * `config_ = config;`, and the NeMo impl does not override it — so a post-load
 * setConfig mutates a struct that is never read again. Worse, the call RESOLVES, so
 * the try/catch guarding it never fired and no breadcrumb was ever emitted.
 *
 * `createSTT` exposes no decodingMethod option either (nor does the Kotlin
 * `buildRecognizerConfig`), so the recognizer is always built with the default. The
 * one construction-time switch is a non-empty `hotwordsFile` on a transducer model,
 * which forces modified_beam_search — but hotwords need BPE-tokenised entries against
 * a `bpe.vocab` this model does not ship, and biasing a recogniser toward the
 * expected answer is the wrong instrument for a grader regardless.
 *
 * So: this constant records what actually runs, and every attempt already in
 * `voice_grading_attempts` — including the 80 that showed one genuine mishear — was
 * decoded greedily. Do not re-add a decoding config without first checking that
 * `createSTT` accepts one.
 */
export const VOICE_DECODING_METHOD = 'greedy_search';

/** Silence fed through the engine once at load to force the ONNX graph to
 *  build. Half a second at 16 kHz — enough to execute the full pipeline,
 *  short enough that the warm-up itself is cheap. */
const WARMUP_SAMPLE_COUNT = TARGET_SAMPLE_RATE / 2;

/**
 * Copy a waveform into the plain `number[]` the native bridge takes.
 *
 * `transcribeSamples` has no Float32Array overload, so this conversion is
 * unavoidable — but it sits directly in the learner's "Checking…" wait, on tens
 * of thousands of samples. `Array.from` went through the iterator protocol and
 * grew the array as it went; pre-sizing and indexing does neither.
 */
function toSampleArray(waveform: Float32Array): number[] {
  const samples = new Array<number>(waveform.length);
  for (let i = 0; i < waveform.length; i += 1) samples[i] = waveform[i] ?? 0;
  return samples;
}

export interface SherpaStt {
  /** Transcribe a 16 kHz mono waveform to trimmed text. null when not ready. */
  transcribe: (waveform: Float32Array) => Promise<string | null>;
  isReady: boolean;
  isLoading: boolean;
  downloadProgress: number;
  error: Error | null;
}

function useSherpaStt({
  enabled,
  modelId,
  modelType = 'auto',
  numThreads = 2,
}: {
  enabled: boolean;
  modelId: string;
  modelType?: STTModelType;
  numThreads?: number;
}): SherpaStt {
  const engineRef = useRef<SttEngine | null>(null);
  const [isReady, setReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function load() {
      if (!enabled) {
        setReady(false);
        setDownloadProgress(0);
        setError(null);
        return;
      }

      setError(null);
      setDownloadProgress(progress => (progress > 0 ? progress : 0.01));
      const loadStartedAt = Date.now();
      void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_LOAD_STARTED, { modelId });
      voiceBreadcrumb('voice.model.load.start', { modelId });

      try {
        const ensureOpts = {
          deleteArchiveAfterExtract: true,
          signal: abortController.signal,
          onProgress: (progress: DownloadProgress) => {
            if (!cancelled) setDownloadProgress(Math.max(0, Math.min(1, progress.percent / 100)));
          },
        };
        // The model id is resolved against an on-device registry the lib caches
        // from the GitHub release listing. A stale cache reads a valid id as
        // "Unknown model id" — force-refresh and retry once.
        let model;
        try {
          model = await ensureModelByCategory(ModelCategory.Stt, modelId, ensureOpts);
        } catch (first) {
          if (cancelled) return;
          if (!/unknown model id/i.test(first instanceof Error ? first.message : String(first))) {
            throw first;
          }
          await refreshModelsByCategory(ModelCategory.Stt);
          model = await ensureModelByCategory(ModelCategory.Stt, modelId, ensureOpts);
        }
        if (cancelled) return;
        const engine = await createSTT({
          modelPath: { type: 'file', path: model.localPath },
          modelType,
          numThreads,
        });
        if (cancelled) {
          await engine.destroy();
          return;
        }

        engineRef.current = engine;

        // Run one throwaway inference before announcing readiness. Creating the
        // engine does not build the ONNX execution graph — the FIRST
        // transcribeSamples() does, and that cost lands inside the learner's
        // "Grading…" wait on the first card of every session. Measured on the
        // Android emulator: 2949 ms for the first transcription vs ~1150 ms for
        // every subsequent one on comparable audio. Paying it here costs nothing
        // (the model has only just finished loading and no card is waiting).
        //
        // Deliberately before setReady(true): while this runs the UI still says
        // "Preparing voice…", which is true. Failures are swallowed — a model
        // that cannot warm up is still worth trying on real speech.
        try {
          const endWarmup = diagSpan('stt.warmup');
          await engine.transcribeSamples(
            toSampleArray(new Float32Array(WARMUP_SAMPLE_COUNT)),
            TARGET_SAMPLE_RATE,
          );
          endWarmup();
        } catch (warmErr) {
          voiceBreadcrumb(
            'voice.warmup.failed',
            { message: warmErr instanceof Error ? warmErr.message : String(warmErr) },
            'warning',
          );
        }
        if (cancelled) return;

        setDownloadProgress(1);
        setReady(true);
        void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_READY, {
          modelId,
          durationMs: Date.now() - loadStartedAt,
        });
        voiceBreadcrumb('voice.model.ready', { modelId, durationMs: Date.now() - loadStartedAt });
      } catch (err) {
        if (!cancelled) {
          setReady(false);
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_FAILED, {
            modelId,
            message: error.message,
          });
          Sentry.captureException(error, {
            tags: { feature: 'voice-grading', stage: 'model-load' },
            extra: { modelId },
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      abortController.abort();
      const engine = engineRef.current;
      engineRef.current = null;
      if (engine) void engine.destroy();
    };
  }, [enabled, modelId, modelType, numThreads]);

  const transcribe = useCallback(async (waveform: Float32Array): Promise<string | null> => {
    const engine = engineRef.current;
    if (!engine || waveform.length === 0) return null;
    const result = await engine.transcribeSamples(toSampleArray(waveform), TARGET_SAMPLE_RATE);
    return (result.text ?? '').trim();
  }, []);

  return useMemo<SherpaStt>(
    () => ({
      transcribe,
      isReady,
      isLoading: enabled && !isReady && error === null,
      downloadProgress,
      error,
    }),
    [transcribe, isReady, enabled, downloadProgress, error],
  );
}

/** Primary single-word recognizer: NVIDIA Parakeet TDT transducer 110M int8. */
export function useParakeetStt({ enabled }: { enabled: boolean }): SherpaStt {
  return useSherpaStt({
    enabled,
    modelId: PARAKEET_MODEL_ID,
    modelType: 'nemo_transducer',
    numThreads: 2,
  });
}
