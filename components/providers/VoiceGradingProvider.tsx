/**
 * App-wide voice grading: owns the Parakeet model lifecycle and a shared
 * VoiceCaptureSession. The model only downloads/loads while the user's
 * `voiceEnabled` setting is true, so users who never opt in pay nothing.
 * Provider sits inside AppContent so the Settings progress row and the Practice
 * review screen share the same loaded model.
 *
 * Grading flow: arm() → energy gate stops → transcribe(waveform) → caller runs
 * the pure matchSingleWord() against the card's expected English.
 *
 * The microphone is opened ONCE and then paused between cards. Everything that
 * used to happen per card — awaiting the previous recorder's teardown, granting
 * the record-capable category, deactivating and reactivating the iOS session,
 * constructing a recorder, re-checking permission, opening an exclusive input
 * stream — happened between the prompt ending and the learner being allowed to
 * speak. That was the wait, and it is now a `resume()`.
 */
import * as Sentry from '@sentry/react-native';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { AudioManager } from 'react-native-audio-api';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import {
  DEFAULT_RECORDING_CONFIG,
  MicPermissionDeniedError,
  VoiceCaptureSession,
  ensureMicPermission,
  type RecordingConfig,
  type RecordingResult,
} from '@/lib/voice/recording';
import { analytics } from '@/services/analytics';
import {
  markArmEntered,
  markAwaitOpen,
  markBeginWindow,
  markRestoreEnd,
  markRestoreStart,
  markRestoreWait,
  markStreamState,
} from '@/utils/armTelemetry';
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
   * Open a capture window and resolve when the energy gate (or hard duration
   * cap) closes it. Caller hands the resulting waveform to `transcribe()`.
   *
   * `onCapturing` fires when the microphone actually starts delivering audio.
   * On a warm session that is now near-immediate, but it is still a distinct
   * moment and the UI must not invite the learner to speak before it.
   */
  arm: (handlers?: { onCapturing?: () => void }) => Promise<VoiceArmOutcome>;
  /** Cancel any in-flight recording without resolving its promise. */
  cancel: () => Promise<void>;
  /**
   * End the current recording NOW and grade what was captured — the release of
   * a hold-to-talk press. This is the same path the energy gate and the
   * watchdog take, not a cancel: the waveform is kept and the pending arm()
   * resolves with it. No-op when nothing is recording.
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
  /**
   * Claim the microphone for a review session: opens the input stream and the
   * record-capable audio session once, up front. Returns a release function.
   *
   * Held for the whole session rather than per card because the category change
   * is the expensive, occasionally multi-second call on iOS, and because
   * flapping the session mode between capture and playback is what made every
   * prompt after a recording play quiet.
   */
  acquireSession: () => () => void;
  /**
   * Hand the audio session to playback, or give it back to the microphone.
   *
   * iOS gives `.playAndRecord` less output gain than `.playback`, so holding
   * the input stream open for a whole review session makes every Arabic prompt
   * quieter than it should be. Measured against a natural experiment: on a
   * build where the stream only opened at the first tap, the FIRST prompt was
   * at full volume and every prompt after it was not.
   *
   * Dropping the stream for the prompt and restoring it afterwards is the only
   * lever available — `.allowBluetoothHFP` and `.defaultToSpeaker` are decided
   * natively (AudioModule.swift) and no JS option suppresses the category
   * itself.
   *
   * Fails SAFE and permanently: if the stream cannot be restored even once,
   * the whole mechanism latches off for the rest of the session and the
   * microphone keeps a record-capable session, because a quiet prompt is a
   * far smaller problem than a dead microphone (which is exactly what an
   * earlier open-on-demand attempt produced).
   */
  setPlaybackPriority: (playbackOnly: boolean) => Promise<void>;
}

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

  // One microphone for the whole app lifetime; opened only while a review
  // session holds it (see acquireSession). Lazy state rather than a ref: the
  // value never changes, and it has to be readable during render to feed the
  // callbacks below.
  const [capture] = useState(() => new VoiceCaptureSession());

  const armResolveRef = useRef<((outcome: VoiceArmOutcome) => void) | null>(null);
  const windowSeqRef = useRef(0);
  const micLevel = useSharedValue(0);
  const levelPeakRef = useRef(MIN_LEVEL_REFERENCE);
  // The in-flight window's own finish(), published so hold-to-talk can end it
  // from outside the arm() promise. Cleared the moment it runs (and by every
  // teardown path), so it can never fire against a superseded window.
  const finishRef = useRef<(() => void) | null>(null);
  /** Review screens currently holding the microphone. */
  const holdersRef = useRef(0);

  /** Settle any pending arm() with a failure and close its window. */
  const abortWindow = useCallback(
    (reason: 'busy' | 'not-ready' | 'error', message?: string): void => {
      windowSeqRef.current += 1;
      finishRef.current = null;
      micLevel.set(0);
      capture.cancelWindow();
      const resolve = armResolveRef.current;
      armResolveRef.current = null;
      resolve?.({ ok: false, reason, ...(message === undefined ? {} : { message }) });
    },
    [capture, micLevel],
  );

  /**
   * Open (or reopen) the session's input stream. Also the recovery path after
   * an interruption or a route change, both of which can leave the stream alive
   * but deaf.
   */
  const openCapture = useCallback(
    async (reopen = false): Promise<void> => {
      if (holdersRef.current === 0) return;
      try {
        if (reopen) await capture.close();
        await capture.open(recordingConfigRef.current);
        // The screen can close while the stream is still opening. Without this
        // the release has already run its own close() and we would be left
        // holding a live microphone with nobody using it.
        if (holdersRef.current === 0) {
          await capture.close();
          return;
        }
        diagMark('mic.session.open', { reopen });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        diagMark('mic.session.open.failed', { message, reopen });
        Sentry.addBreadcrumb({
          category: 'voice',
          level: 'warning',
          message: 'voice.session.open.failed',
          data: { message, reopen },
        });
      }
    },
    [capture],
  );

  /**
   * Claim the microphone for a review session. The audio session becomes
   * record-capable here and stays that way until the last holder releases it,
   * so no card pays for a category change.
   */
  /** True while the session has been handed to playback for a prompt. */
  const playbackPriorityRef = useRef(false);
  /** Latched on the first failure to restore — see setPlaybackPriority. */
  const playbackPriorityBrokenRef = useRef(false);
  /** Serializes every playback/record handoff. A same-direction caller must also
   * join the active transition: `playbackPriorityRef` describes the completed
   * native state, not merely the most recently requested state. */
  const handoffRef = useRef<Promise<void> | null>(null);

  const setPlaybackPriority = useCallback(
    async (playbackOnly: boolean): Promise<void> => {
      const previous = handoffRef.current;
      const queuedAt = Date.now();
      const handoff = (async () => {
        if (previous) {
          await previous.catch(() => undefined);
          if (!playbackOnly) markRestoreWait(Date.now() - queuedAt);
        }
        if (playbackPriorityBrokenRef.current) return;
        // The first prompt effect is registered before useVoiceReview's session
        // acquisition effect. Remember that playback already owns the session,
        // so the later acquisition does not turn recording on underneath it.
        if (holdersRef.current === 0) {
          if (playbackOnly) playbackPriorityRef.current = true;
          return;
        }
        // Never under a live window: closing the stream would discard the audio
        // the learner is producing right now.
        if (capture.isCapturing) return;
        if (playbackOnly === playbackPriorityRef.current) return;

        if (playbackOnly) {
          diagMark('mic.session.toPlayback');
          await capture.close();
          await simpleAudioService.setRecordingSessionEnabled(false);
          playbackPriorityRef.current = true;
          return;
        }

        markRestoreStart();
        try {
          await simpleAudioService.setRecordingSessionEnabled(true);
          await openCapture();
          if (!capture.isOpen) {
            // One forced retry, then give up on the mechanism entirely rather
            // than leave the learner tapping a mic that will never open.
            await openCapture(true);
          }
          diagMark('mic.session.toRecord', { restored: capture.isOpen });
          if (!capture.isOpen) {
            playbackPriorityBrokenRef.current = true;
            Sentry.addBreadcrumb({
              category: 'voice',
              level: 'warning',
              message: 'voice.playbackPriority.disabled',
            });
            // Leave the session record-capable so the arm ladder has something to
            // work with; the prompt goes back to being quiet, which is survivable.
            await simpleAudioService.setRecordingSessionEnabled(true);
          }
          playbackPriorityRef.current = false;
        } finally {
          markRestoreEnd();
        }
      })();
      handoffRef.current = handoff;
      try {
        await handoff;
      } finally {
        if (handoffRef.current === handoff) handoffRef.current = null;
      }
    },
    [capture, openCapture],
  );

  const acquireSession = useCallback((): (() => void) => {
    holdersRef.current += 1;
    if (holdersRef.current === 1) {
      // Opens the input stream up front, and it has to stay that way.
      //
      // Deferring it to the tap was tried and reverted: opening on demand cost
      // 1008 ms on the first card (the ~19 ms that justified the attempt was a
      // WARM reopen mid-session, not a cold open — the wrong number to
      // generalise from), and worse, it failed outright, producing 15
      // consecutive `arm_failed` rows where the microphone never came back for
      // the rest of the session. Opening while nothing contends for the device
      // is what makes the tap reliable.
      //
      // The cost is real and unresolved: an open input stream lights the iOS
      // microphone indicator for the whole session, before the learner has
      // asked for anything, and it forces the output route onto .playAndRecord
      // (quieter playback — see AUDIO_MODE_CONFIG). Fixing that means releasing
      // the recording session between cards, not opening the stream late.
      // A first prompt may already own playback: useReview registers that effect
      // before useVoiceReview registers this acquisition. In that case markDone
      // will restore/open the microphone after the prompt; opening here would
      // switch the prompt back to the quiet record-capable route mid-word.
      if (!playbackPriorityRef.current) {
        void simpleAudioService.setRecordingSessionEnabled(true).then(() => openCapture());
      }
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holdersRef.current -= 1;
      if (holdersRef.current > 0) return;
      abortWindow('not-ready');
      const previous = handoffRef.current;
      const cleanup = (async () => {
        await previous?.catch(() => undefined);
        await capture.close();
        await simpleAudioService.setRecordingSessionEnabled(false);
        playbackPriorityRef.current = false;
        playbackPriorityBrokenRef.current = false;
      })();
      handoffRef.current = cleanup;
      void cleanup.finally(() => {
        if (handoffRef.current === cleanup) handoffRef.current = null;
      });
    };
  }, [abortWindow, capture, openCapture]);

  // A stream that dies mid-session used to be invisible: no error surfaced and
  // the card simply recorded nothing until noSpeechTimeoutMs. Now it fails the
  // in-flight window immediately and reopens, so the caller's retry ladder gets
  // a working microphone back on the next attempt instead of the same dead one.
  useEffect(() => {
    capture.onStreamError(message => {
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'warning',
        message: 'voice.recorder.error',
        data: { message },
      });
      abortWindow('error', message);
      void openCapture(true);
    });
    return () => capture.onStreamError(null);
  }, [abortWindow, capture, openCapture]);

  // Interruptions (a call, Siri, another app taking the session) and route
  // changes (a headset arriving or leaving) both leave the input stream
  // present but silent. Neither was handled at all, so the card waited out its
  // dead-air timeout and the learner read it as "the mic randomly stops working".
  useEffect(() => {
    // Gated on the setting, like the model download: a user who never opts into
    // voice should not have this provider turning on system audio observation
    // for the rest of the app.
    if (!enabled) return;
    AudioManager.observeAudioInterruptions(true);
    const interruption = AudioManager.addSystemEventListener('interruption', ({ type }) => {
      diagMark('mic.interruption', { type });
      if (type === 'began') {
        abortWindow('error', 'interrupted');
        return;
      }
      void openCapture(true);
    });
    const routeChange = AudioManager.addSystemEventListener('routeChange', ({ reason }) => {
      diagMark('mic.routeChange', { reason });
      // A device arriving or leaving re-points the input; anything else is
      // cosmetic and reopening would cost a card its microphone for nothing.
      if (reason !== 'NewDeviceAvailable' && reason !== 'OldDeviceUnavailable') return;
      abortWindow('error', `route:${reason}`);
      void openCapture(true);
    });
    return () => {
      interruption?.remove();
      routeChange?.remove();
      AudioManager.observeAudioInterruptions(false);
    };
  }, [enabled, abortWindow, openCapture]);

  // Stop the mic when the user turns the setting off mid-session.
  useEffect(() => {
    if (enabled) return;
    abortWindow('not-ready');
    void capture.close();
  }, [enabled, abortWindow, capture]);

  const arm = useCallback(
    async function arm(handlers?: { onCapturing?: () => void }): Promise<VoiceArmOutcome> {
      markArmEntered();
      // Whoever borrowed the session for playback may not have given it back —
      // the English answer claims it and has no finish event to hand it over
      // on. The microphone reclaims it here rather than trusting that, so a tap
      // can never land on a session that is still in .playback.
      await setPlaybackPriority(false);
      if (!isReady) {
        diagMark('mic.arm.reject', { reason: 'not-ready' });
        return { ok: false, reason: 'not-ready' };
      }
      if (capture.isCapturing || armResolveRef.current !== null) {
        diagMark('mic.arm.reject', { reason: 'busy' });
        return { ok: false, reason: 'busy' };
      }

      // Normally already open — acquireSession did it when the screen mounted.
      // This covers a first card that beat the open, and any reopen still in
      // flight after an interruption.
      markStreamState(capture.isOpen);
      if (!capture.isOpen) {
        const endOpen = diagSpan('mic.awaitOpen');
        const openStartedAt = Date.now();
        await openCapture();
        markAwaitOpen(Date.now() - openStartedAt);
        endOpen({ opened: capture.isOpen });
        if (!capture.isOpen) {
          diagMark('mic.arm.reject', { reason: 'stream-closed' });
          return { ok: false, reason: 'error', message: 'input stream unavailable' };
        }
      }

      windowSeqRef.current += 1;
      const windowId = windowSeqRef.current;
      levelPeakRef.current = MIN_LEVEL_REFERENCE;
      diagMark('mic.arm.request', { windowId });

      return new Promise<VoiceArmOutcome>(resolve => {
        armResolveRef.current = resolve;

        const finish = (): void => {
          if (armResolveRef.current !== resolve) return; // already resolved
          if (windowId !== windowSeqRef.current) return; // stale callback
          armResolveRef.current = null;
          finishRef.current = null;
          micLevel.set(0);

          // Synchronous: no stream teardown, no audio-session restore. The
          // caller starts transcribing on this frame — that hand-off used to
          // wait on both.
          const result = capture.endWindow();
          diagMark('mic.stopped', {
            windowId,
            durationMs: result.durationMs,
            stopReason: result.stopReason,
            bufferCount: result.bufferCount,
            firstBufferMs: result.firstBufferMs,
            heardSpeech: result.heardSpeech,
            peakRms: Number(result.peakRms.toFixed(5)),
            samples: result.waveform.length,
          });
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'info',
            message: 'voice.recorder.stopped',
            data: {
              windowId,
              durationMs: result.durationMs,
              bufferCount: result.bufferCount,
              stopReason: result.stopReason,
              heardSpeech: result.heardSpeech,
              peakRms: result.peakRms,
              firstBufferMs: result.firstBufferMs,
            },
          });
          if (result.bufferCount === 0) {
            void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_FAILED, {
              stage: 'recorder-no-buffers',
              durationMs: result.durationMs,
              stopReason: result.stopReason,
            });
            // The stream is present but deaf. Reopening now means the retry
            // lands on a live microphone rather than the same dead one.
            void openCapture(true);
            resolve({ ok: false, reason: 'error', message: 'no audio from microphone' });
            return;
          }
          resolve({ ok: true, result });
        };

        finishRef.current = finish;

        try {
          markBeginWindow();
          capture.beginWindow(
            {
              onAutoStop: finish,
              onCapturing: () => {
                // Stale guard: a window from a superseded arm() must not flip
                // the current card's UI to "listening".
                if (windowId === windowSeqRef.current) handlers?.onCapturing?.();
              },
              onLevel: rms => {
                if (windowId !== windowSeqRef.current) return;
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
          );
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'info',
            message: 'voice.recorder.arm',
            data: { windowId },
          });
        } catch (err) {
          armResolveRef.current = null;
          finishRef.current = null;
          micLevel.set(0);
          const message = err instanceof Error ? err.message : String(err);
          diagMark('mic.window.failed', { message });
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'warning',
            message: 'voice.recorder.start.failed',
            data: { windowId, error: message },
          });
          if (err instanceof MicPermissionDeniedError) {
            resolve({ ok: false, reason: 'permission' });
          } else {
            resolve({ ok: false, reason: 'error', message });
          }
        }
      });
    },
    [capture, isReady, micLevel, openCapture, setPlaybackPriority],
  );

  /**
   * Hold-to-talk release. Runs the window's normal finish path, so the captured
   * waveform is graded exactly as if the energy gate had called time on it —
   * the learner just decided where the silence starts.
   */
  const stopListening = useCallback((): void => {
    const finish = finishRef.current;
    if (!finish) return;
    diagMark('mic.stopRequested');
    finish();
  }, []);

  const cancel = useCallback(async (): Promise<void> => {
    abortWindow('busy');
    return Promise.resolve();
  }, [abortWindow]);

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
      acquireSession,
      setPlaybackPriority,
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
      acquireSession,
      setPlaybackPriority,
    ],
  );

  return <VoiceGradingContext value={value}>{children}</VoiceGradingContext>;
};
