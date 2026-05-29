/**
 * App-wide voice grading: owns the Parakeet model lifecycle and a shared
 * VoiceRecorder. The model only downloads/loads while the user's `voiceEnabled`
 * setting is true, so users who never opt in pay nothing. Provider sits inside
 * AppContent so the Settings progress row and the Practice review screen share
 * the same loaded model.
 *
 * Grading flow: arm() → energy gate stops → transcribe(waveform) → caller runs
 * the pure matchSingleWord() against the card's expected English.
 */
import * as Sentry from '@sentry/react-native';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type FC,
  type ReactNode,
} from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import {
  MicPermissionDeniedError,
  VoiceRecorder,
  type RecordingResult,
} from '@/lib/voice/recording';
import { analytics } from '@/services/analytics';
import { useAppSelectorShallow } from '@/store/hooks';

export type VoiceArmOutcome =
  | { ok: true; result: RecordingResult }
  | { ok: false; reason: 'permission' | 'not-ready' | 'busy' | 'error'; message?: string };

interface VoiceGradingContextValue {
  /** Mirrors the Redux `voiceEnabled` setting. */
  enabled: boolean;
  /** Model loaded and ready to grade. */
  isReady: boolean;
  /** Model is downloading/loading right now. */
  isLoading: boolean;
  /** First-load progress, 0..1. */
  downloadProgress: number;
  /** Load error, or null. */
  error: string | null;
  /**
   * Open the mic and resolve when the energy gate (or hard duration cap) stops
   * it. Caller hands the resulting waveform to `transcribe()`.
   */
  arm: () => Promise<VoiceArmOutcome>;
  /** Cancel any in-flight recording without resolving its promise. */
  cancel: () => Promise<void>;
  /** Transcribe a 16 kHz mono waveform. null when the model isn't ready. */
  transcribe: (waveform: Float32Array) => Promise<string | null>;
}

const VoiceGradingContext = createContext<VoiceGradingContextValue | null>(null);

export const useVoiceGrading = (): VoiceGradingContextValue => {
  const ctx = use(VoiceGradingContext);
  if (!ctx) throw new Error('useVoiceGrading must be used within a VoiceGradingProvider');
  return ctx;
};

export const VoiceGradingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const enabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  const stt = useParakeetStt({ enabled });
  const { transcribe: rawTranscribe, isReady, isLoading, downloadProgress, error } = stt;

  // Fresh recorder per arm() call. Reusing one across cards leaves the iOS
  // audio session in a stale state and the next start() resolves but never
  // delivers buffers (handleBuffer never fires, onAutoStop never triggers).
  // Matches the edenmind reference pattern that's known to work on device.
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const armResolveRef = useRef<((outcome: VoiceArmOutcome) => void) | null>(null);
  const sessionRef = useRef(0);

  // Stop the mic when the user turns the setting off mid-session.
  useEffect(() => {
    if (enabled) return;
    sessionRef.current += 1;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder?.isRecording) {
      void recorder.cancel();
    }
    armResolveRef.current?.({ ok: false, reason: 'not-ready' });
    armResolveRef.current = null;
  }, [enabled]);

  const arm = useCallback(async (): Promise<VoiceArmOutcome> => {
    if (!isReady) return { ok: false, reason: 'not-ready' };
    if (recorderRef.current) return { ok: false, reason: 'busy' };

    sessionRef.current += 1;
    const sessionId = sessionRef.current;
    const recorder = new VoiceRecorder();
    recorderRef.current = recorder;

    Sentry.addBreadcrumb({
      category: 'voice',
      level: 'info',
      message: 'voice.recorder.arm',
      data: { sessionId },
    });

    return new Promise<VoiceArmOutcome>(resolve => {
      armResolveRef.current = resolve;
      const finish = async (): Promise<void> => {
        if (armResolveRef.current !== resolve) return; // already resolved
        if (sessionId !== sessionRef.current) return; // stale callback
        armResolveRef.current = null;
        Sentry.addBreadcrumb({
          category: 'voice',
          level: 'info',
          message: 'voice.recorder.finish',
          data: { sessionId },
        });
        try {
          const result = await recorder.stop();
          recorderRef.current = null;
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'info',
            message: 'voice.recorder.stopped',
            data: {
              sessionId,
              durationMs: result.durationMs,
              bufferCount: result.bufferCount,
              stopReason: result.stopReason,
              heardSpeech: result.heardSpeech,
              peakRms: result.peakRms,
            },
          });
          if (result.bufferCount === 0) {
            void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_FAILED, {
              stage: 'recorder-no-buffers',
              durationMs: result.durationMs,
              stopReason: result.stopReason,
            });
          }
          resolve({ ok: true, result });
        } catch (err) {
          recorderRef.current = null;
          Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
            tags: { feature: 'voice-grading', stage: 'recorder-stop' },
          });
          resolve({
            ok: false,
            reason: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      };

      recorder
        .start({ onAutoStop: () => void finish() })
        .then(() => {
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'info',
            message: 'voice.recorder.started',
            data: { sessionId },
          });
        })
        .catch((err: unknown) => {
          recorderRef.current = null;
          if (armResolveRef.current !== resolve) return;
          armResolveRef.current = null;
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'warning',
            message: 'voice.recorder.start.failed',
            data: { sessionId, error: err instanceof Error ? err.message : String(err) },
          });
          if (err instanceof MicPermissionDeniedError) {
            resolve({ ok: false, reason: 'permission' });
          } else {
            resolve({
              ok: false,
              reason: 'error',
              message: err instanceof Error ? err.message : String(err),
            });
          }
        });
    });
  }, [isReady]);

  const cancel = useCallback(async (): Promise<void> => {
    sessionRef.current += 1;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (armResolveRef.current) {
      armResolveRef.current({ ok: false, reason: 'busy' });
      armResolveRef.current = null;
    }
    if (recorder?.isRecording) {
      await recorder.cancel();
    }
  }, []);

  const transcribe = useCallback(
    async (waveform: Float32Array): Promise<string | null> => {
      if (!isReady) return null;
      try {
        return await rawTranscribe(waveform);
      } catch {
        return null;
      }
    },
    [isReady, rawTranscribe],
  );

  const value = useMemo<VoiceGradingContextValue>(
    () => ({
      enabled,
      isReady,
      isLoading,
      downloadProgress,
      error: error?.message ?? null,
      arm,
      cancel,
      transcribe,
    }),
    [enabled, isReady, isLoading, downloadProgress, error, arm, cancel, transcribe],
  );

  return <VoiceGradingContext value={value}>{children}</VoiceGradingContext>;
};
