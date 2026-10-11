/**
 * Recognizer RESIDENCY — building the Parakeet engine from a model that is
 * already on disk, and holding it in RAM.
 *
 * This hook used to do three things in one effect keyed on `voiceEnabled`: the
 * ~103 MB download, the `createSTT` engine build, and the warm-up inference.
 * Welding them meant the bytes could not be fetched without also paying the RAM,
 * and — worse — the effect's cleanup aborted the download and deleted its resume
 * state. The download now lives in `services/voiceModelStore.ts`, which has no
 * React lifecycle to be torn down by.
 *
 * What is left here is genuinely per-component: an ONNX engine is expensive
 * enough that who holds it, and for how long, is a real decision. See
 * `VoiceGradingProvider.acquireEngine` for the retain/release counter that
 * decides `retained`.
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
import { createSTT, type STTModelType, type SttEngine } from 'react-native-sherpa-onnx/stt';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TARGET_SAMPLE_RATE } from '@/lib/voice/recording';
import { PARAKEET_MODEL_ID } from '@/constants/voiceModel';
import { analytics } from '@/services/analytics';
import { prepareHotwordFiles } from '@/services/voiceHotwordFiles';
import { countHotwords } from '@/utils/voiceHotwords';
import { span as diagSpan } from '@/utils/reviewDiagnostics';
import { voiceBreadcrumb } from '@/utils/errorHandling';

/** Silence fed through the engine once at load to force the ONNX graph to
 *  build. Half a second at 16 kHz — enough to execute the full pipeline,
 *  short enough that the warm-up itself is cheap. */
const WARMUP_SAMPLE_COUNT = TARGET_SAMPLE_RATE / 2;
/** A native engine build must settle into ready or failed; never spin forever. */
const VOICE_ENGINE_LOAD_TIMEOUT_MS = 45_000;

/** The native build never settled. Distinct so nothing retries into a hung native thread. */
class EngineLoadTimeoutError extends Error {}

export async function createEngineWithTimeout(
  create: () => Promise<SttEngine>,
  timeoutMs = VOICE_ENGINE_LOAD_TIMEOUT_MS,
): Promise<SttEngine> {
  const pending = create();
  let timer!: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Native creation cannot be cancelled. If it eventually returns after
      // the UI has failed closed, release that orphan rather than leaking
      // ~100 MB.
      void pending.then(engine => engine.destroy()).catch(() => undefined);
      reject(
        new EngineLoadTimeoutError(
          `Voice engine did not load within ${Math.round(timeoutMs / 1000)} seconds`,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

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
  /** True only AFTER the warm-up inference — i.e. the engine is genuinely usable. */
  isReady: boolean;
  /** Building or warming. Distinct from the model download, which is not this hook's concern. */
  isWarming: boolean;
  /** Phrases the live engine is biased toward. 0 means it decodes greedily. */
  hotwordCount: number;
  error: Error | null;
}

/**
 * Build the engine biased toward `hotwords`, or unbiased when there are none.
 *
 * Hotwords are an improvement to a recogniser that already works, so nothing
 * about them may cost the learner their voice review: a vocabulary that cannot
 * be prepared, or an engine that refuses it, falls back to the unbiased build.
 */
async function createEngine(
  options: { modelPath: string; modelType: STTModelType; numThreads: number },
  hotwords: string,
): Promise<{ engine: SttEngine; hotwordCount: number }> {
  const base = {
    modelPath: { type: 'file' as const, path: options.modelPath },
    modelType: options.modelType,
    numThreads: options.numThreads,
  };
  if (hotwords) {
    try {
      const hotwordOptions = await prepareHotwordFiles(options.modelPath, hotwords);
      const engine = await createEngineWithTimeout(() => createSTT({ ...base, ...hotwordOptions }));
      return { engine, hotwordCount: countHotwords(hotwords) };
    } catch (err) {
      // A build that timed out is still running natively. Starting the unbiased
      // one behind it would double the wait rather than rescue it.
      if (err instanceof EngineLoadTimeoutError) throw err;
      voiceBreadcrumb(
        'voice.hotwords.failed',
        { message: err instanceof Error ? err.message : String(err) },
        'warning',
      );
    }
  }
  return { engine: await createEngineWithTimeout(() => createSTT(base)), hotwordCount: 0 };
}

function useSherpaStt({
  retained,
  modelPath,
  modelType = 'auto',
  numThreads = 2,
  hotwords,
}: {
  /** Whether anything currently wants a live recognizer. */
  retained: boolean;
  /** Path to an already-downloaded model, or null when the bytes are not there yet. */
  modelPath: string | null;
  modelType?: STTModelType;
  numThreads?: number;
  /** One phrase per line; empty for an unbiased engine. Fixed for an engine's life. */
  hotwords: string;
}): SherpaStt {
  const engineRef = useRef<SttEngine | null>(null);
  /**
   * One native operation at a time, across effect generations.
   *
   * Hotwords are fixed when an engine is constructed, so a new vocabulary means
   * a new engine — and the old one has to be fully destroyed first. Without this
   * the cleanup's `destroy()` and the next `createSTT` ran side by side, which
   * holds two ~100 MB models at once and lets the new build overwrite the
   * hotword files the dying engine was built from.
   */
  const operationsRef = useRef<Promise<unknown>>(Promise.resolve());
  const [hotwordCount, setHotwordCount] = useState(0);
  const [isReady, setReady] = useState(false);
  const [isWarming, setWarming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
      const next = operationsRef.current.then(work);
      operationsRef.current = next.catch(() => undefined);
      return next;
    };

    async function load() {
      if (!retained || !modelPath) {
        setReady(false);
        setWarming(false);
        setError(null);
        return;
      }

      setError(null);
      // The previous engine is already gone by the time this runs for a new
      // vocabulary, so the old readiness must not outlive it.
      setReady(false);
      setWarming(true);
      const loadStartedAt = Date.now();
      void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_LOAD_STARTED, {
        modelId: PARAKEET_MODEL_ID,
      });
      voiceBreadcrumb('voice.engine.load.start', { modelId: PARAKEET_MODEL_ID });

      try {
        // Queued behind the previous engine's destroy. A load superseded while
        // it waited builds nothing, and one superseded while it was building
        // destroys what it built before the queue moves on — as a separate
        // queued step that destroy would land BEHIND the next build, and two
        // engines would be resident at once.
        const built = await enqueue(async () => {
          if (cancelled) return null;
          const result = await createEngine({ modelPath, modelType, numThreads }, hotwords);
          if (!cancelled) return result;
          await result.engine.destroy();
          return null;
        });
        if (!built) return;
        const { engine } = built;

        engineRef.current = engine;
        setHotwordCount(built.hotwordCount);

        // Run one throwaway inference before announcing readiness. Creating the
        // engine does not build the ONNX execution graph — the FIRST
        // transcribeSamples() does, and that cost lands inside the learner's
        // "Grading…" wait on the first card of every session.
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

        setWarming(false);
        setReady(true);
        void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_READY, {
          modelId: PARAKEET_MODEL_ID,
          durationMs: Date.now() - loadStartedAt,
        });
        voiceBreadcrumb('voice.engine.ready', {
          modelId: PARAKEET_MODEL_ID,
          durationMs: Date.now() - loadStartedAt,
          hotwordCount: built.hotwordCount,
        });
      } catch (err) {
        if (!cancelled) {
          setReady(false);
          setWarming(false);
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_FAILED, {
            modelId: PARAKEET_MODEL_ID,
            message: error.message,
            stage: 'engine',
          });
          Sentry.captureException(error, {
            tags: { feature: 'voice-grading', stage: 'model-load' },
            extra: { modelId: PARAKEET_MODEL_ID },
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      const engine = engineRef.current;
      engineRef.current = null;
      if (engine) void enqueue(() => engine.destroy()).catch(() => undefined);
    };
  }, [retained, modelPath, modelType, numThreads, hotwords]);

  const transcribe = useCallback(async (waveform: Float32Array): Promise<string | null> => {
    const engine = engineRef.current;
    if (!engine || waveform.length === 0) return null;
    const result = await engine.transcribeSamples(toSampleArray(waveform), TARGET_SAMPLE_RATE);
    return (result.text ?? '').trim();
  }, []);

  return useMemo<SherpaStt>(
    () => ({ transcribe, isReady, isWarming, hotwordCount, error }),
    [transcribe, isReady, isWarming, hotwordCount, error],
  );
}

/** Primary single-word recognizer: NVIDIA Parakeet TDT transducer 110M int8. */
export function useParakeetStt({
  retained,
  modelPath,
  hotwords,
}: {
  retained: boolean;
  modelPath: string | null;
  hotwords: string;
}): SherpaStt {
  return useSherpaStt({
    retained,
    modelPath,
    modelType: 'nemo_transducer',
    numThreads: 2,
    hotwords,
  });
}
