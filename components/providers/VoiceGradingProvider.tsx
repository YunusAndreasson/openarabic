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

import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import {
  MicPermissionDeniedError,
  VoiceRecorder,
  type RecordingResult,
} from '@/lib/voice/recording';
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

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const armResolveRef = useRef<((outcome: VoiceArmOutcome) => void) | null>(null);
  const isRecordingRef = useRef(false);

  const getRecorder = useCallback((): VoiceRecorder => {
    if (!recorderRef.current) recorderRef.current = new VoiceRecorder();
    return recorderRef.current;
  }, []);

  // Stop the mic when the user turns the setting off mid-session.
  useEffect(() => {
    if (enabled) return;
    const recorder = recorderRef.current;
    if (recorder?.isRecording) {
      void recorder.cancel();
    }
    isRecordingRef.current = false;
    armResolveRef.current?.({ ok: false, reason: 'not-ready' });
    armResolveRef.current = null;
  }, [enabled]);

  const arm = useCallback(async (): Promise<VoiceArmOutcome> => {
    if (!isReady) return { ok: false, reason: 'not-ready' };
    if (isRecordingRef.current) return { ok: false, reason: 'busy' };
    const recorder = getRecorder();
    isRecordingRef.current = true;

    return new Promise<VoiceArmOutcome>(resolve => {
      armResolveRef.current = resolve;
      const finish = async (): Promise<void> => {
        if (armResolveRef.current !== resolve) return; // already resolved
        armResolveRef.current = null;
        try {
          const result = await recorder.stop();
          isRecordingRef.current = false;
          resolve({ ok: true, result });
        } catch (err) {
          isRecordingRef.current = false;
          resolve({
            ok: false,
            reason: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      };

      recorder
        .start({ onAutoStop: () => void finish() })
        .catch((err: unknown) => {
          isRecordingRef.current = false;
          if (armResolveRef.current !== resolve) return;
          armResolveRef.current = null;
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
  }, [isReady, getRecorder]);

  const cancel = useCallback(async (): Promise<void> => {
    const recorder = recorderRef.current;
    isRecordingRef.current = false;
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
