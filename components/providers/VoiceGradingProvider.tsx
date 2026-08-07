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
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import {
  DEFAULT_RECORDING_CONFIG,
  ensureMicPermission,
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
  /**
   * End the current recording NOW and grade what was captured — the release of
   * a hold-to-talk press. This is the same path the energy gate and the
   * watchdog take (`finish()`), not a cancel: the waveform is kept and the
   * pending arm() resolves with it. No-op when nothing is recording.
   */
  stopListening: () => void;
  /**
   * Live input level for a meter, 0..1, republished ~10x/second while
   * recording. A shared value rather than state on purpose — a meter that
   * re-rendered the review screen ten times a second would cost more than the
   * microphone does. Returns to 0 whenever the recorder stops, so a stale bar
   * can't be left standing on a card that is no longer listening.
   */
  micLevel: SharedValue<number>;
  /** Transcribe a 16 kHz mono waveform. null when the model isn't ready. */
  transcribe: (waveform: Float32Array) => Promise<string | null>;
  /**
   * Request the microphone permission ahead of the first arm(), so the OS
   * dialog never opens mid-card. Safe to call repeatedly — it runs once and
   * resolves immediately thereafter.
   */
  prewarmPermission: () => Promise<void>;
}

/** Ceiling on waiting for the previous recorder's native teardown. Generous
 *  enough that a healthy close (tens of ms on device) never trips it, short
 *  enough that a wedged one costs one card's mic instead of every card's. */
const TEARDOWN_WAIT_MS = 1200;

/**
 * The meter's reference level adapts to the recording instead of using a fixed
 * RMS→bar mapping. Device input gain varies by an order of magnitude — the
 * recorder's own normalizeGain is allowed to apply up to 60x after the fact,
 * which is what a quiet capture looks like — so anything fixed either pins the
 * bars to the floor on one phone or saturates them on another. Track the
 * loudest buffer so far, decay it, and scale against that.
 */
const LEVEL_PEAK_DECAY = 0.985; // per ~100 ms buffer → ~4.6 s half-life
/** Floor under the reference, so a silent room's noise can't be amplified into
 *  a full meter that claims the mic is hearing speech. */
const MIN_LEVEL_REFERENCE = 0.02;

/** Resolves true if `work` settled inside the budget, false if it outlived it.
 *  The work is abandoned, never cancelled — the caller decides what a timeout
 *  means. Module scope so it never enters a useCallback dependency list. */
async function raceDeadline(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<false>(resolve => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([work.then(() => true as const), deadline]);
  } finally {
    clearTimeout(timer);
  }
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
  const micLevel = useSharedValue(0);
  const levelPeakRef = useRef(MIN_LEVEL_REFERENCE);
  // The in-flight recording's own finish(), published so hold-to-talk can end
  // it from outside the arm() promise. Cleared the moment it runs (and by every
  // teardown path), so it can never fire against a superseded session.
  const finishRef = useRef<(() => void) | null>(null);
  // In-flight native teardown of the PREVIOUS recorder. The input stream is
  // opened in exclusive sharing mode, so starting the next card's recorder
  // while the last one is still closing races the audio HAL — the new start()
  // fails and the card ends up with a mic that never opens. arm() awaits this.
  const teardownRef = useRef<Promise<void> | null>(null);

  /** Cancel a recorder and remember the teardown so the next arm() can wait. */
  const beginTeardown = useCallback(
    (recorder: VoiceRecorder | null): void => {
      finishRef.current = null;
      micLevel.set(0);
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
    },
    [micLevel],
  );

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
      // stream before opening ours — but never indefinitely. This await had no
      // ceiling, so a native stop() that never settled held every subsequent
      // card's mic shut with no diagnostic and no way out. Past the deadline we
      // open anyway: a start() that loses the race fails fast and the caller's
      // bounded retry ladder recovers, which is strictly better than hanging.
      if (teardownRef.current) {
        const endTeardown = diagSpan('mic.awaitTeardown');
        const settled = await raceDeadline(teardownRef.current, TEARDOWN_WAIT_MS);
        endTeardown({ timedOut: !settled });
        if (!settled) {
          diagMark('mic.teardown.timeout', { waitedMs: TEARDOWN_WAIT_MS });
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'warning',
            message: 'voice.teardown.timeout',
          });
          // Drop the stale promise so the NEXT card doesn't queue behind the
          // same never-settling teardown all over again.
          teardownRef.current = null;
        }
        if (recorderRef.current) {
          diagMark('mic.arm.reject', { reason: 'busy-after-teardown' });
          return { ok: false, reason: 'busy' };
        }
      }

      sessionRef.current += 1;
      const sessionId = sessionRef.current;
      levelPeakRef.current = MIN_LEVEL_REFERENCE;
      diagMark('mic.arm.request', { sessionId });

      // Grant the session the record-capable category before the recorder tries
      // to claim it. Outside this window the app stays on plain .playback, which
      // is louder and keeps output off the Bluetooth hands-free route (see
      // setRecordingSessionEnabled).
      //
      // Spanned because this and the iOS deactivate below were the only two
      // awaits on the arm path with no instrumentation at all — they land
      // before VoiceRecorder sets its own clock, so the HUD's "mic open Xms"
      // never counted them. On iOS an AVAudioSession category change can block
      // for seconds when another process holds the session or a Bluetooth route
      // is renegotiating, which is exactly the intermittent multi-second stall
      // that could not be reproduced on Android.
      const endSessionGrant = diagSpan('mic.session.grant');
      await simpleAudioService.setRecordingSessionEnabled(true);
      endSessionGrant();

      // simpleAudioService preconfigures the iOS AVAudioSession in 'playback'
      // and never deactivates it. react-native-audio-api can change the category
      // to 'playAndRecord' only on a fresh / inactive session, so without this
      // deactivate→reactivate cycle the mic opens against a stale playback
      // session and delivers near-silent buffers. Best-effort, swallowed errors:
      // the call will surface its real failure via Sentry if it matters.
      if (Platform.OS === 'ios') {
        const endDeactivate = diagSpan('mic.session.deactivate');
        try {
          await setIsAudioActiveAsync(false);
          endDeactivate();
        } catch (err) {
          endDeactivate({ failed: true });
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
          finishRef.current = null;
          micLevel.set(0);
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

        // Published only now, so a hold-to-talk release before start() resolves
        // finds nothing to stop and simply lets the energy gate do its job.
        finishRef.current = () => void finish();

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
              onLevel: rms => {
                if (sessionId !== sessionRef.current) return;
                const reference = Math.max(
                  rms,
                  levelPeakRef.current * LEVEL_PEAK_DECAY,
                  MIN_LEVEL_REFERENCE,
                );
                levelPeakRef.current = reference;
                // sqrt: RMS is a power measure, so a linear bar leaves ordinary
                // speech hugging the bottom of the meter.
                micLevel.set(Math.min(1, Math.sqrt(rms / reference)));
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
            finishRef.current = null;
            micLevel.set(0);
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
    [isReady, micLevel],
  );

  /**
   * Hold-to-talk release. Runs the recorder's normal finish path, so the
   * captured waveform is graded exactly as if the energy gate had called time
   * on it — the learner just decided where the silence starts.
   */
  const stopListening = useCallback((): void => {
    const finish = finishRef.current;
    if (!finish) return;
    diagMark('mic.stopRequested');
    finish();
  }, []);

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

  // Ask for the microphone before a card needs it. Without this the OS dialog
  // opens inside the first arm() of a learner's first voice session — i.e. in
  // the middle of a card, after its Arabic prompt has already played, with the
  // screen showing nothing while the dialog blocks the arm. Verified on the
  // Android emulator: the first card sat in `arming` until the dialog was
  // answered. Calling it at session start keeps the ask in context (the learner
  // just opened Practice) and takes it off the per-card critical path.
  //
  // Runs at most once per provider lifetime; a denial is not retried here — the
  // arm path still handles it and turns the setting off with a toast.
  const permissionPrewarmedRef = useRef(false);
  const prewarmPermission = useCallback(async (): Promise<void> => {
    if (permissionPrewarmedRef.current) return;
    permissionPrewarmedRef.current = true;
    const endPrewarm = diagSpan('mic.permission.prewarm');
    try {
      const allowed = await ensureMicPermission();
      endPrewarm({ allowed });
    } catch (err) {
      endPrewarm({ failed: true });
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'warning',
        message: 'voice.permission.prewarm.failed',
        data: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }, []);

  const value = useMemo<VoiceGradingContextValue>(
    () => ({
      enabled,
      isReady,
      isLoading,
      downloadProgress,
      error: error?.message ?? null,
      arm,
      cancel,
      stopListening,
      micLevel,
      transcribe,
      prewarmPermission,
    }),
    [
      enabled,
      isReady,
      isLoading,
      downloadProgress,
      error,
      arm,
      cancel,
      stopListening,
      micLevel,
      transcribe,
      prewarmPermission,
    ],
  );

  return <VoiceGradingContext value={value}>{children}</VoiceGradingContext>;
};
