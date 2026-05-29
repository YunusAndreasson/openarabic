/**
 * NVIDIA Parakeet TDT 0.6B v2 int8 wrapper. Downloads the model on first
 * `enabled` flip (~460 MB), surfaces progress for the Settings screen, then
 * exposes a `transcribe(Float32Array) → string | null` for the review flow.
 *
 * Ported from edemind's use-sherpa-stt.ts.
 */
import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const PARAKEET_MODEL_ID = 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8';

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
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'info',
        message: 'voice.model.load.start',
        data: { modelId },
      });

      try {
        const ensureOpts = {
          deleteArchiveAfterExtract: true,
          signal: abortController.signal,
          onProgress: (progress: DownloadProgress) => {
            if (!cancelled)
              setDownloadProgress(Math.max(0, Math.min(1, progress.percent / 100)));
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
        setDownloadProgress(1);
        setReady(true);
        void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_READY, {
          modelId,
          durationMs: Date.now() - loadStartedAt,
        });
        Sentry.addBreadcrumb({
          category: 'voice',
          level: 'info',
          message: 'voice.model.ready',
          data: { modelId, durationMs: Date.now() - loadStartedAt },
        });
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
    const result = await engine.transcribeSamples(Array.from(waveform), TARGET_SAMPLE_RATE);
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

/** Primary single-word recognizer: NVIDIA Parakeet TDT 0.6B v2 int8. */
export function useParakeetStt({ enabled }: { enabled: boolean }): SherpaStt {
  return useSherpaStt({
    enabled,
    modelId: PARAKEET_MODEL_ID,
    modelType: 'nemo_transducer',
    numThreads: 2,
  });
}
