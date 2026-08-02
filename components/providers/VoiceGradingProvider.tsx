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
import { setIsAudioActiveAsync } from 'expo-audio';
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
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import {
  DEFAULT_RECORDING_CONFIG,
  MicPermissionDeniedError,
  VoiceRecorder,
  type RecordingConfig,
  type RecordingResult,
} from '@/lib/voice/recording';
import { analytics } from '@/services/analytics';
import { simpleAudioService } from '@/services/audioPlayer';
import { useAppSelectorShallow } from '@/store/hooks';
import { mark as diagMark, span as diagSpan } from '@/utils/reviewDiagnostics';

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
   *
   * `onCapturing` fires when the microphone actually starts delivering audio,
   * which is several hundred ms after this call — the UI must not invite the
   * learner to speak before it.
   */
  arm: (handlers?: { onCapturing?: () => void }) => Promise<VoiceArmOutcome>;
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

  // Advanced recording knobs (Account → Advanced). Held in a ref so arm()
  // always reads the latest values without re-creating the callback (its
  // identity flows into the context value consumed by the review screen).
  const energyGateEnabled = useAppSelectorShallow(state => state.settings.voiceEnergyGateEnabled);
  const gainNormalizeEnabled = useAppSelectorShallow(
    state => state.settings.voiceGainNormalizeEnabled,
  );
  const iosRawMode = useAppSelectorShallow(state => state.settings.voiceIosRawMode);
  const recordingConfigRef = useRef<RecordingConfig>(DEFAULT_RECORDING_CONFIG);
  useEffect(() => {
    recordingConfigRef.current = {
      ...DEFAULT_RECORDING_CONFIG,
      energyGateEnabled,
      gainNormalizeEnabled,
      iosRawMode,
    };
  }, [energyGateEnabled, gainNormalizeEnabled, iosRawMode]);

  // Fresh recorder per arm() call. Reusing one across cards leaves the iOS
  // audio session in a stale state and the next start() resolves but never
  // delivers buffers (handleBuffer never fires, onAutoStop never triggers).
  // Matches the edenmind reference pattern that's known to work on device.
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const armResolveRef = useRef<((outcome: VoiceArmOutcome) => void) | null>(null);
  const sessionRef = useRef(0);
  // In-flight native teardown of the PREVIOUS recorder. The input stream is
  // opened in exclusive sharing mode, so starting the next card's recorder
  // while the last one is still closing races the audio HAL — the new start()
  // fails and the card ends up with a mic that never opens. arm() awaits this.
  const teardownRef = useRef<Promise<void> | null>(null);

  /** Cancel a recorder and remember the teardown so the next arm() can wait. */
  const beginTeardown = useCallback((recorder: VoiceRecorder | null): void => {
    // Both branches restore the session through the same awaited call, and both
    // publish the promise on teardownRef, so a cancelled card lands back on
    // plain .playback exactly like one that timed out. They used to differ:
    // the cancel path released the category without waiting and never cycled
    // the iOS session, which left a manually revealed answer playing over the
    // record-capable route.
    const stopped = recorder?.isRecording
      ? recorder.cancel().catch(() => {
          // A failed teardown must not block the next arm — the recorder is gone
          // either way and start() surfaces any real problem.
        })
      : Promise.resolve();
    const teardown = stopped.then(() => simpleAudioService.setRecordingSessionEnabled(false));
    teardownRef.current = teardown;
    void teardown.then(() => {
      if (teardownRef.current === teardown) teardownRef.current = null;
    });
  }, []);

  // Stop the mic when the user turns the setting off mid-session.
  useEffect(() => {
    if (enabled) return;
    sessionRef.current += 1;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    beginTeardown(recorder);
    armResolveRef.current?.({ ok: false, reason: 'not-ready' });
    armResolveRef.current = null;
  }, [enabled, beginTeardown]);

  const arm = useCallback(
    async function arm(handlers?: { onCapturing?: () => void }): Promise<VoiceArmOutcome> {
      if (!isReady) {
        diagMark('mic.arm.reject', { reason: 'not-ready' });
        return { ok: false, reason: 'not-ready' };
      }
      if (recorderRef.current) {
        diagMark('mic.arm.reject', { reason: 'busy' });
        return { ok: false, reason: 'busy' };
      }

      // Let the previous card's recorder finish closing its exclusive input
      // stream before opening ours.
      if (teardownRef.current) {
        const endTeardown = diagSpan('mic.awaitTeardown');
        await teardownRef.current;
        endTeardown();
        if (recorderRef.current) {
          diagMark('mic.arm.reject', { reason: 'busy-after-teardown' });
          return { ok: false, reason: 'busy' };
        }
      }

      sessionRef.current += 1;
      const sessionId = sessionRef.current;
      diagMark('mic.arm.request', { sessionId });

      // Grant the session the record-capable category before the recorder tries
      // to claim it. Outside this window the app stays on plain .playback, which
      // is louder and keeps output off the Bluetooth hands-free route (see
      // setRecordingSessionEnabled).
      await simpleAudioService.setRecordingSessionEnabled(true);

      // simpleAudioService preconfigures the iOS AVAudioSession in 'playback'
      // and never deactivates it. react-native-audio-api can change the category
      // to 'playAndRecord' only on a fresh / inactive session, so without this
      // deactivate→reactivate cycle the mic opens against a stale playback
      // session and delivers near-silent buffers. Best-effort, swallowed errors:
      // the call will surface its real failure via Sentry if it matters.
      if (Platform.OS === 'ios') {
        try {
          await setIsAudioActiveAsync(false);
        } catch (err) {
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'warning',
            message: 'voice.session.deactivate.failed',
            data: { error: err instanceof Error ? err.message : String(err) },
          });
        }
      }

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
            // Back to plain playback: the reveal audio and the next card's prompt
            // should not play through the record-capable category. This also
            // hands the session back to expo-audio (mirroring the deactivate we
            // did before start()) — see setRecordingSessionEnabled.
            await simpleAudioService.setRecordingSessionEnabled(false);
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
                firstBufferMs: result.firstBufferMs,
              },
            });
            diagMark('mic.stopped', {
              sessionId,
              durationMs: result.durationMs,
              stopReason: result.stopReason,
              bufferCount: result.bufferCount,
              firstBufferMs: result.firstBufferMs,
              heardSpeech: result.heardSpeech,
              peakRms: Number(result.peakRms.toFixed(5)),
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
            await simpleAudioService.setRecordingSessionEnabled(false);
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

        const endStart = diagSpan('mic.recorder.started');
        recorder
          .start(
            {
              onAutoStop: () => void finish(),
              onCapturing: () => {
                // Stale session guard: a recorder from a superseded arm() must
                // not flip the current card's UI to "listening".
                if (sessionId === sessionRef.current) handlers?.onCapturing?.();
              },
            },
            recordingConfigRef.current,
          )
          .then(() => {
            endStart({ sessionId });
            Sentry.addBreadcrumb({
              category: 'voice',
              level: 'info',
              message: 'voice.recorder.started',
              data: { sessionId },
            });
          })
          .catch((err: unknown) => {
            endStart({ sessionId, failed: true });
            recorderRef.current = null;
            void simpleAudioService.setRecordingSessionEnabled(false);
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
    },
    [isReady],
  );

  const cancel = useCallback(async (): Promise<void> => {
    sessionRef.current += 1;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (armResolveRef.current) {
      armResolveRef.current({ ok: false, reason: 'busy' });
      armResolveRef.current = null;
    }
    beginTeardown(recorder);
    await teardownRef.current;
  }, [beginTeardown]);

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
