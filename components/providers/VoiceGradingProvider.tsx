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
 * A capture session is retained after the first explicit voice action. Retries
 * resume its input stream, but Arabic prompts temporarily close that stream
 * and take playback priority to preserve iOS output volume. Restoring the input
 * after a prompt is asynchronous; arm() joins that restore if a tap beats it.
 */
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { AudioManager } from 'react-native-audio-api';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { VOICE_HOTWORDS_ENABLED } from '@/constants/voiceModel';
import { useParakeetStt } from '@/hooks/voice/useSherpaStt';
import { useVoiceModel } from '@/hooks/voice/useVoiceModel';
import { useVoiceModelPrefetch } from '@/hooks/voice/useVoiceModelPrefetch';
import { useSpeechGate } from '@/hooks/voice/useSpeechGate';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import {
  DEFAULT_RECORDING_CONFIG,
  MicPermissionDeniedError,
  VoiceCaptureSession,
  ensureMicPermission,
  withHandsFreeBudget,
  type RecordingConfig,
  type RecordingResult,
  type SpeechGate,
  type VoiceArmFailureReason,
} from '@/lib/voice/recording';
import { analytics } from '@/services/analytics';
import {
  markArmEntered,
  markAwaitOpen,
  markBeginWindow,
  markRestoreEnd,
  markRestoreModeReady,
  markRestoreStart,
  markRestoreWait,
  markStreamState,
} from '@/utils/armTelemetry';
import { CaptureOpenQueue } from '@/utils/captureOpenQueue';
import { simpleAudioService } from '@/services/audioPlayer';
import { useAppSelectorShallow } from '@/store/hooks';
import {
  selectVoiceEnergyGateEnabled,
  selectVoiceGainNormalizeEnabled,
} from '@/store/settingsSlice';
import { mark as diagMark, span as diagSpan } from '@/utils/reviewDiagnostics';
import { voiceBreadcrumb } from '@/utils/errorHandling';
import { mergeHotwords } from '@/utils/voiceHotwords';

export type VoiceArmOutcome =
  | { ok: true; result: RecordingResult }
  | { ok: false; reason: VoiceArmFailureReason; message?: string };

interface VoiceGradingContextValue {
  /** Mirrors the Redux `voiceEnabled` setting. */
  enabled: boolean;
  /** Recognizer built AND warmed — ready to grade. */
  isReady: boolean;
  /** Recognizer is being built or warmed right now. */
  isWarming: boolean;
  /** Engine build error, or null. Download errors live on the model store. */
  error: string | null;
  /**
   * Retain the recognizer in RAM; the returned function releases it.
   *
   * Mirrors `acquireSession` below, and for the same reason: the resource is
   * expensive and shared. A ~110M-parameter int8 ONNX model is not something to
   * hold for the whole app run now that voice is on by default — a learner
   * reading articles on a 3 GB Android device should not be carrying a
   * recognizer, and an app that does becomes a prime low-memory-killer target
   * while backgrounded.
   *
   * Retained by the Practice tab (on focus) and by an open review session. The
   * tab retainer is what buys the warm-up its time: the learner spends several
   * seconds reading stats before tapping Start, and the engine builds in that
   * window rather than against their first card.
   *
   * Release is deferred by VOICE_ENGINE_LINGER_MS so Practice → review →
   * Practice never drops to zero and rebuilds.
   */
  acquireEngine: () => () => void;
  /**
   * Offer the answers of the review that is open as the recogniser's hotwords.
   *
   * Hotwords are fixed when the engine is built, so a vocabulary the engine does
   * not already cover rebuilds it — `isReady` is false until the new one is
   * warm. The vocabulary only grows, and is deliberately kept after the review
   * closes: the engine lingers for the next session, which usually draws on the
   * same words and then rebuilds nothing.
   */
  offerHotwordGlosses: (glosses: readonly string[]) => void;
  /** Phrases the live engine is biased toward; 0 when it decodes greedily. */
  hotwordCount: number;
  /**
   * Open a capture window and resolve when the energy gate (or hard duration
   * cap) closes it. Caller hands the resulting waveform to `transcribe()`.
   *
   * `onCapturing` fires when the microphone actually starts delivering audio.
   * On a warm session that is now near-immediate, but it is still a distinct
   * moment and the UI must not invite the learner to speak before it.
   */
  arm: (options?: {
    onCapturing?: () => void;
    /**
     * The window is opening on the card's behalf rather than on a tap, so it
     * has to outlast the learner thinking. Widens only the two deadlines that
     * measure the wait for speech — see `withHandsFreeBudget`.
     */
    handsFree?: boolean;
  }) => Promise<VoiceArmOutcome>;
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
  /**
   * Is the microphone's input stream open right now?
   *
   * A function rather than state: it is read at one instant (a prompt starting)
   * and publishing it would re-render the review screen on every session
   * transition for a value nothing draws.
   *
   * Exists for telemetry. `simpleAudioService.isRecordingSessionEnabled` says
   * what the app BELIEVES the session is, and the whole failure mode this was
   * added for is that belief being wrong — so a second, independently derived
   * fact is needed to catch it. An open stream can only exist on a
   * record-capable session, so "playback owns it" plus "the stream is open" is
   * the desync, stated by the native side rather than by the flag that lied.
   */
  isMicStreamOpen: () => boolean;
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

/**
 * How long the recognizer survives its last release.
 *
 * Practice → review → Practice releases and re-retains within a second or two,
 * and rebuilding across that would cost the learner a 3 s warm-up in the middle
 * of their own session. Two minutes covers the whole visit-cluster while still
 * handing the memory back to someone who has genuinely moved on to reading.
 */
const VOICE_ENGINE_LINGER_MS = 120_000;

export const VoiceGradingProvider = ({ children }: { children: ReactNode }) => {
  const enabled = useAppSelectorShallow(state => state.settings.voiceEnabled);

  // The bytes: fetched independently of everything below, on Wi-Fi, and never
  // torn down by this component's lifecycle.
  useVoiceModelPrefetch({ active: enabled });
  const model = useVoiceModel();

  /** Screens currently wanting a live recognizer. Mirrors `holdersRef`. */
  const engineHoldersRef = useRef(0);
  const engineLingerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [engineRetained, setEngineRetained] = useState(false);

  const acquireEngine = useCallback((): (() => void) => {
    engineHoldersRef.current += 1;
    if (engineLingerRef.current) {
      clearTimeout(engineLingerRef.current);
      engineLingerRef.current = null;
    }
    setEngineRetained(true);

    // Idempotent release, exactly as `acquireSession` does it: a screen that
    // unmounts twice (Fast Refresh, a double cleanup) must not drive the count
    // negative, which would pin the engine for the app's life.
    let released = false;
    return () => {
      if (released) return;
      released = true;
      engineHoldersRef.current -= 1;
      if (engineHoldersRef.current > 0) return;
      if (engineLingerRef.current) clearTimeout(engineLingerRef.current);
      engineLingerRef.current = setTimeout(() => {
        engineLingerRef.current = null;
        if (engineHoldersRef.current === 0) setEngineRetained(false);
      }, VOICE_ENGINE_LINGER_MS);
    };
  }, []);

  useEffect(
    () => () => {
      if (engineLingerRef.current) clearTimeout(engineLingerRef.current);
    },
    [],
  );

  const [hotwords, setHotwords] = useState('');
  const offerHotwordGlosses = useCallback((glosses: readonly string[]): void => {
    if (!VOICE_HOTWORDS_ENABLED) return;
    setHotwords(current => mergeHotwords(current, glosses));
  }, []);

  const stt = useParakeetStt({
    retained: enabled && engineRetained,
    modelPath: model.state === 'ready' ? model.localPath : null,
    hotwords,
  });
  const { transcribe: rawTranscribe, isReady, isWarming, hotwordCount, error } = stt;

  /**
   * The voice-activity detector, loaded next to the recogniser so one setting
   * still gates every voice download.
   *
   * Gated on `enabled` rather than on `engineRetained`: at ~1.8 MB it is under
   * two per cent of Parakeet's ~103 MB, and holding it in memory for the app's
   * lifetime costs far less than re-loading it at the top of every session —
   * which is the moment a card is already waiting on a microphone. Its readiness
   * is never a gate on anything: a window that opens before it lands simply runs
   * on the energy gate — and `RecordingResult.gateUsed`, which every attempt
   * writes to `voice_grading_attempts`, is how we find out whether it ever did.
   */
  const { gate: speechGate } = useSpeechGate({ enabled });
  /**
   * Read inside `arm()`, which must not be re-created when the gate loads.
   *
   * `arm`'s identity flows into the context value, and `useVoiceReview`'s arm
   * effect takes that value as a dependency — so a new one mid-card runs the
   * effect's cleanup, which cancels the recording in progress. The model
   * landing while someone is mid-answer would have thrown their answer away.
   */
  const speechGateRef = useRef<SpeechGate | null>(null);
  useEffect(() => {
    speechGateRef.current = speechGate;
  }, [speechGate]);

  // Advanced recording knobs (Account → Advanced). Held in a ref so arm()
  // always reads the latest values without re-creating the callback (its
  // identity flows into the context value consumed by the review screen).
  const energyGateEnabled = useAppSelectorShallow(selectVoiceEnergyGateEnabled);
  const gainNormalizeEnabled = useAppSelectorShallow(selectVoiceGainNormalizeEnabled);
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
  /**
   * Claimed synchronously at the top of `arm()`, before its first `await`.
   *
   * The busy check further down (`armResolveRef.current !== null`) only
   * becomes true once `arm()` reaches its `armResolveRef.current = resolve`
   * assignment — which sits behind at least one `await` (`setPlaybackPriority`,
   * sometimes `openCapture` too). Two `arm()` calls issued close together (a
   * fast double-tap before the caller's own `disabled` state commits — see
   * useVoiceReview's `phaseRef`, which lags the tap by one render) both read
   * `armResolveRef.current === null` before either has set it, both pass the
   * busy check, and both proceed. The second call's `capture.beginWindow()`
   * then silently no-ops (the session is already open), but its `finish`
   * closure overwrites `armResolveRef.current` — so when the FIRST window
   * later ends, its own `finish` reads a stale `resolve` reference, bails via
   * the `armResolveRef.current !== resolve` guard, and never calls
   * `capture.endWindow()`. The stream is left open with nothing to close it,
   * `armResolveRef.current` points at a `resolve` nothing will ever call, and
   * every arm() for the rest of the session fails the busy check — a mic
   * that's dead until the app restarts. Claiming here, before any await, is
   * atomic (JS is single-threaded — a second `arm()` invocation can't run
   * until this synchronous prefix, including the claim, has completed) and
   * closes the gap the later check can't.
   */
  const armClaimRef = useRef(false);
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
  /**
   * Why `capture.open()` last refused, kept so the arm outcome can say it.
   *
   * The failure below is swallowed on purpose — a microphone that will not open
   * is not a crash — but the message was going only to a Sentry breadcrumb, and
   * a breadcrumb without an event never leaves the device. Every arm failure
   * therefore reported the symptom ("input stream unavailable") and never the
   * cause.
   */
  const lastOpenErrorRef = useRef<string | null>(null);
  // Whether that failure was specifically a denied OS permission, as opposed
  // to a transient stream/session hiccup. `capture.open()` throws the same
  // Error shape for both, and the message alone isn't a safe discriminator
  // for callers — this flag is, since it's set from the actual error class.
  const lastOpenWasPermissionDeniedRef = useRef(false);

  /**
   * Serializes every capture open/close transition — see {@link CaptureOpenQueue}
   * for the join-vs-queue rule.
   *
   * Four separate signals can ask for a reopen — an interruption ending, a route
   * change, a stream error, and the app returning to the foreground — and after
   * a phone call at least two of them fire within a moment of each other. Two
   * overlapping close/open pairs interleave into a recorder built against a
   * session the other half is still tearing down.
   *
   * This used to guard only reopen-against-reopen, which left the two mixed
   * orderings open. A signal-driven `reopenCapture()` and `arm()`'s recovery rung
   * (a deliberately unqueued `openCapture()`, on the learner's tap) could reach
   * `capture.close({ releaseSession: true })` and `capture.open()` at the same
   * moment: `arm` awaits its own `setPlaybackPriority(false)`, which DRAINS the
   * handoff chain and leaves it empty, so a signal landing in that gap starts a
   * reopen immediately with nothing to queue behind. Neither call joined the
   * other — the old guard only fired when both were reopens.
   */
  const openQueueRef = useRef(new CaptureOpenQueue());

  /** True while the session has been handed to playback for a prompt. */
  const playbackPriorityRef = useRef(false);
  /** Latched on the first failure to restore — see setPlaybackPriority. */
  const playbackPriorityBrokenRef = useRef(false);
  // Any forced input recovery disables deferral for this provider's life.
  // Recovery keeps the established Expo grant + deactivate/rebuild sequence.
  const recordingGrantRequiredRef = useRef(false);
  /** Serializes every playback/record handoff. A same-direction caller must also
   * join the active transition: `playbackPriorityRef` describes the completed
   * native state, not merely the most recently requested state. */
  const handoffRef = useRef<Promise<void> | null>(null);

  const openCapture = useCallback(
    async (reopen = false): Promise<void> => {
      if (holdersRef.current === 0) return;
      return openQueueRef.current.run(reopen ? 'reopen' : 'open', async (): Promise<void> => {
        try {
          // A reopen only ever happens because the input is broken — an
          // interruption, a route change, or a stream error. Release the audio
          // session on the way down so the reopen genuinely rebuilds the engine;
          // see VoiceCaptureSession.close, where the field evidence lives.
          if (reopen) {
            recordingGrantRequiredRef.current = true;
            await capture.close({ releaseSession: true });
          }
          // Opening the stream reconfigures the SHARED audio session as
          // record-capable (`configureVoiceSessionOptions`: `.playAndRecord`,
          // plus mode `.measurement` when the Advanced iOS raw-mode toggle is
          // on). Say so through simpleAudioService, which owns the playback
          // lane's view of that session, BEFORE it happens.
          //
          // Two of the five paths into here already did — acquireSession and the
          // restore half of setPlaybackPriority — and the ones that did not are
          // why a backgrounded review came back silent. The foreground/
          // interruption/route-change reopen re-applied the record-capable
          // session behind simpleAudioService's back, so its
          // `recordingSessionEnabled` flag still said "playback"; from then on
          // every guard that would have handed the session back to playback was
          // an equality check against that stale flag and no-opped, leaving each
          // prompt on the `.measurement` session that IOS_SESSION_MODE was moved
          // off precisely because it plays "noticeably quiet". The learner hears
          // nothing, `play()` still reports success, and nothing is logged.
          //
          // Normal restore may already have delegated the category switch to
          // the recorder. Recovery must override that logical ownership flag
          // and reapply the established Expo grant after deactivation.
          await simpleAudioService.setRecordingSessionEnabled(true, { force: reopen });
          // The microphone owns the session from here, so the flag has to agree
          // — otherwise the next prompt's handoff sees "playback already has it"
          // and skips the category/mode change it needs. Set at the grant rather
          // than after a successful open, because the grant is what makes
          // playback quiet: an open that then fails must still leave the next
          // prompt able to take the session back.
          playbackPriorityRef.current = false;
          await capture.open(recordingConfigRef.current);
          lastOpenErrorRef.current = null;
          lastOpenWasPermissionDeniedRef.current = false;
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
          lastOpenErrorRef.current = message;
          lastOpenWasPermissionDeniedRef.current = err instanceof MicPermissionDeniedError;
          diagMark('mic.session.open.failed', { message, reopen });
          voiceBreadcrumb('voice.session.open.failed', { message, reopen }, 'warning');
        }
      });
    },
    [capture],
  );

  /**
   * A reopen that takes its turn in the session's handoff queue.
   *
   * `openCapture(true)` deactivates and rebuilds the iOS audio session, and the
   * four SIGNAL-driven reopens — an interruption ending, a route change, a
   * stream error, the app returning to the foreground — all fired it outside the
   * handoff chain that every other session transition goes through — as did the
   * deaf-microphone recovery, which fires from a window's finish callback. (The
   * one caller that deliberately stays off THIS chain is arm()'s recovery rung:
   * it runs on the learner's tap, after its own restore has already drained the
   * chain, and queueing the critical path behind anything is what it is there to
   * avoid. It is still serialized against a transition physically in flight —
   * see `CaptureOpenQueue` — because staying off the handoff chain is not the
   * same as being free to open a stream while a reopen releases the session
   * under it.)
   * Returning to
   * a review is the case where that hurts: the provider's foreground listener
   * and the review's own prompt replay run in the same tick, so the rebuild's
   * `setActive(false)` / `.playAndRecord` landed in the middle of the replay's
   * handoff, in whichever order the two chains happened to interleave. Queueing
   * it makes the order the registration order — reopen, then replay — which is
   * the one that leaves the prompt audible.
   *
   * Still one reopen at a time: a caller arriving while another is queued or in
   * flight joins it, because two overlapping close/open pairs build a recorder
   * against a session the other half is still tearing down (after a phone call
   * at least two of those signals fire within a moment of each other).
   */
  const reopenQueuedRef = useRef<Promise<void> | null>(null);
  /**
   * A reopen that was owed while the prompt held the session, to be paid the
   * moment playback hands it back.
   *
   * A reopen grabs the session for recording, and doing that mid-word is the
   * quiet-prompt bug itself — `acquireSession` has guarded against exactly this
   * since it was written ("opening here would switch the prompt back to the
   * quiet record-capable route mid-word"); the reopen signals never did. But
   * skipping it outright is not an option either: the plain `open()` the restore
   * performs is a no-op against a recorder object that still exists, and a
   * reopen is asked for precisely when that object is dead. So the debt is
   * carried across the prompt and settled by the restore, which runs before the
   * learner can tap.
   */
  const reopenOwedRef = useRef(false);
  const reopenCapture = useCallback((): Promise<void> => {
    const queued = reopenQueuedRef.current;
    if (queued) return queued;
    const previous = handoffRef.current;
    const handoff = (async () => {
      await previous?.catch(() => undefined);
      if (playbackPriorityRef.current) {
        reopenOwedRef.current = true;
        diagMark('mic.session.reopen.deferred');
        return;
      }
      await openCapture(true);
    })();
    reopenQueuedRef.current = handoff;
    handoffRef.current = handoff;
    void handoff.finally(() => {
      if (reopenQueuedRef.current === handoff) reopenQueuedRef.current = null;
      if (handoffRef.current === handoff) handoffRef.current = null;
    });
    return handoff;
  }, [openCapture]);

  /**
   * Claim the microphone for a review session. The audio session becomes
   * record-capable here and stays that way until the last holder releases it,
   * so no card pays for a category change.
   */
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
          if (playbackOnly) {
            playbackPriorityRef.current = true;
            // Say it to the session too, not just to this ref. Remembering it
            // only here is what made the FIRST card of a session inherit
            // whatever shape the previous one left behind: a session left
            // record-capable plays the prompt on the quiet `.measurement`
            // route, and every card after it then takes the
            // `playbackOnly === playbackPriorityRef.current` short-circuit
            // below — so the whole session stayed silent, not just one card.
            await simpleAudioService.setRecordingSessionEnabled(false);
          }
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
          const directRestore =
            Platform.OS === 'ios' && !recordingGrantRequiredRef.current && !reopenOwedRef.current;
          if (directRestore) {
            // audio-api caches both desired options and activation. After Expo
            // playback, both can look unchanged even though the actual category
            // is playback-only. Reset BEFORE capture.open: native start attaches
            // input before its final forced activation, which is too late to
            // safely change the category of an already materialized input graph.
            await capture.close();
            try {
              await AudioManager.setAudioSessionActivity(false);
            } catch {
              // A reset we cannot confirm must not take the direct path. Unlike
              // close({releaseSession:true}), this await surfaces rejection.
              recordingGrantRequiredRef.current = true;
              diagMark('mic.session.directRestore.resetFailed');
            }
          }
          await simpleAudioService.setRecordingSessionEnabled(true, {
            deferToRecorder: directRestore && !recordingGrantRequiredRef.current,
          });
          markRestoreModeReady();
          // Settle any reopen deferred while the prompt was playing — see
          // reopenOwedRef. Forcing it here costs the teardown/rebuild only on
          // the cards where something actually broke the input.
          const owed = reopenOwedRef.current;
          reopenOwedRef.current = false;
          await openCapture(owed);
          if (!capture.isOpen) {
            recordingGrantRequiredRef.current = true;
            diagMark('mic.session.directRestore.failed');
            // One forced retry, then give up on the mechanism entirely rather
            // than leave the learner tapping a mic that will never open.
            await openCapture(true);
          }
          diagMark('mic.session.toRecord', { restored: capture.isOpen });
          if (!capture.isOpen) {
            playbackPriorityBrokenRef.current = true;
            voiceBreadcrumb('voice.playbackPriority.disabled', undefined, 'warning');
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
      // Join the pending handoff before touching the session. This was the one
      // transition that did not, and it is why the SECOND session of an app
      // launch came up with a dead microphone while a restart always fixed it:
      //
      //   screen 1 unmounts → release() → holders 0 → an async cleanup starts
      //     (close the stream, setRecordingSessionEnabled(false))
      //   screen 2 mounts   → acquire() → holders 1 → setRecordingSessionEnabled(true)
      //     → openCapture()
      //
      // Nothing ordered those two. The new session's open would land first and
      // the old session's teardown would then close the stream underneath it and
      // switch the category back off recording — after which `capture.open()`
      // throws for the rest of the app's life, every arm returns "input stream
      // unavailable", and the prompt still plays perfectly because only the
      // record half is gone. It is a race, so it missed as often as it hit,
      // which is why it read as flakiness rather than a lifecycle bug.
      const previous = handoffRef.current;
      const startup = (async () => {
        await previous?.catch(() => undefined);
        // Read AFTER the teardown, not before: the release path clears this on
        // its way out, so a value sampled synchronously above would be the
        // outgoing session's.
        //
        // A first prompt may already own playback: useReview registers that
        // effect before useVoiceReview registers this acquisition. In that case
        // markDone will restore/open the microphone after the prompt; opening
        // here would switch the prompt back to the quiet record-capable route
        // mid-word.
        if (playbackPriorityRef.current) return;
        // Another holder arrived and left again while we waited.
        if (holdersRef.current === 0) return;
        await simpleAudioService.setRecordingSessionEnabled(true);
        await openCapture();
      })();
      handoffRef.current = startup;
      void startup.finally(() => {
        if (handoffRef.current === startup) handoffRef.current = null;
      });
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
        // Forced: a review must never hand the app back a recording session.
        // Without `force` this is an equality check, so it no-ops on exactly the
        // exit that needs it most — one taken while playback held the session
        // (the flag already reads false) after a reopen had reconfigured the
        // session record-capable underneath it. That combination left the whole
        // app, not just review, on `.playAndRecord` + `.measurement`, with
        // nothing anywhere that would ever set the category or mode back.
        await simpleAudioService.setRecordingSessionEnabled(false, { force: true });
        playbackPriorityRef.current = false;
        playbackPriorityBrokenRef.current = false;
        // A debt owed to a session that no longer exists is not owed.
        reopenOwedRef.current = false;
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
      voiceBreadcrumb('voice.recorder.error', { message }, 'warning');
      abortWindow('error', message);
      void reopenCapture();
    });
    return () => capture.onStreamError(null);
  }, [abortWindow, capture, reopenCapture]);

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
      void reopenCapture();
    });
    const routeChange = AudioManager.addSystemEventListener('routeChange', ({ reason }) => {
      diagMark('mic.routeChange', { reason });
      // A device arriving or leaving re-points the input; anything else is
      // cosmetic and reopening would cost a card its microphone for nothing.
      if (reason !== 'NewDeviceAvailable' && reason !== 'OldDeviceUnavailable') return;
      abortWindow('error', `route:${reason}`);
      void reopenCapture();
    });
    return () => {
      interruption?.remove();
      routeChange?.remove();
      AudioManager.observeAudioInterruptions(false);
    };
  }, [enabled, abortWindow, reopenCapture]);

  /**
   * Rebuild the input stream when the app comes back with a review still
   * holding the microphone.
   *
   * The interruption listener above is the precise signal, but it is not a
   * reliable one: a call takes the app to the background, and an `ended` event
   * delivered while it is there does its reopen against a session the app is
   * not allowed to activate — so it fails, silently, and nothing tries again.
   * That is exactly what the field telemetry shows. After a 3.5-minute call the
   * learner came back to a card whose microphone was dead, tapped three times,
   * and got `recorder.start failed` on each, all with a healthy session and the
   * built-in microphone present in the route. Leaving the app and returning did
   * not help them because, until this, nothing in the voice lane listened for
   * it at all.
   *
   * Cheap when it is not needed: `openCapture` returns immediately with no
   * holders, and joins an interruption-driven reopen when one is already in
   * flight rather than starting a second.
   *
   * Queued rather than fired directly (see reopenCapture). The review's own
   * foreground listener replays the interrupted prompt in this same tick, and
   * this rebuild deactivates and reconfigures the session those two lanes share
   * — unordered, it is the reason the returned-to card came back silent even
   * though the microphone recovered.
   */
  useResumeFromBackground(() => {
    if (holdersRef.current === 0) return;
    diagMark('mic.session.foreground');
    void reopenCapture();
  }, enabled);

  // Stop the mic when the user turns the setting off mid-session.
  useEffect(() => {
    if (enabled) return;
    abortWindow('not-ready');
    void capture.close();
  }, [enabled, abortWindow, capture]);

  const arm = useCallback(
    async function arm(options?: {
      onCapturing?: () => void;
      handsFree?: boolean;
    }): Promise<VoiceArmOutcome> {
      // Synchronous — before any await — so a second call arriving before
      // this one reaches `armResolveRef.current = resolve` still sees the
      // claim and bails, instead of racing it. See armClaimRef's own comment.
      if (armClaimRef.current) {
        diagMark('mic.arm.reject', { reason: 'busy' });
        return { ok: false, reason: 'busy' };
      }
      armClaimRef.current = true;
      try {
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
        // `capture.isOpen` is a live getter that an await can flip, but the
        // compiler narrows it on the first test and then reads every later one as
        // dead code. Going through a call keeps each check honest.
        const streamIsOpen = (): boolean => capture.isOpen;

        markStreamState(streamIsOpen());
        if (!streamIsOpen()) {
          const endOpen = diagSpan('mic.awaitOpen');
          const openStartedAt = Date.now();
          await openCapture();
          if (!streamIsOpen()) {
            // The stream cannot open, and the most likely reason is that the
            // audio session is no longer record-capable — a teardown turned it
            // off. Turning it back on and forcing a fresh open is the difference
            // between one bad card and a microphone that stays dead until the app
            // is restarted, which is exactly how this failure was reported.
            diagMark('mic.arm.recover');
            await simpleAudioService.setRecordingSessionEnabled(true);
            await openCapture(true);
          }
          markAwaitOpen(Date.now() - openStartedAt);
          endOpen({ opened: streamIsOpen() });
          if (!streamIsOpen()) {
            // A denied permission is not the transient hiccup the other reasons
            // are — retrying it can never succeed. Reporting it as 'permission'
            // (not the generic 'error') routes it to useVoiceReview's dedicated
            // handling: it stops the retry ladder immediately, tells the learner
            // why, and turns voice off, instead of quietly burning through
            // MAX_ARM_RETRIES on a mic that will never open and then giving up
            // in silence — indistinguishable from the tap never having landed.
            if (lastOpenWasPermissionDeniedRef.current) {
              diagMark('mic.arm.reject', { reason: 'permission' });
              return {
                ok: false,
                reason: 'permission',
                message: lastOpenErrorRef.current ?? undefined,
              };
            }
            diagMark('mic.arm.reject', { reason: 'stream-closed' });
            return {
              ok: false,
              reason: 'error',
              // Carry the reason `capture.open()` actually gave. Without it every
              // one of these looks identical in telemetry and says only that the
              // stream is not open, which is the symptom we already knew.
              message: lastOpenErrorRef.current
                ? `input stream unavailable: ${lastOpenErrorRef.current}`
                : 'input stream unavailable',
            };
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
            voiceBreadcrumb('voice.recorder.stopped', {
              windowId,
              durationMs: result.durationMs,
              bufferCount: result.bufferCount,
              stopReason: result.stopReason,
              heardSpeech: result.heardSpeech,
              peakRms: result.peakRms,
              firstBufferMs: result.firstBufferMs,
            });
            if (result.bufferCount === 0) {
              void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_FAILED, {
                stage: 'recorder-no-buffers',
                durationMs: result.durationMs,
                stopReason: result.stopReason,
              });
              // The stream is present but deaf. Reopening now means the retry
              // lands on a live microphone rather than the same dead one.
              //
              // Through the QUEUE, not `openCapture(true)` directly. This is not
              // arm()'s recovery rung — it fires from a window's finish callback,
              // off the learner's tap and with no restore ahead of it to drain
              // the chain — so a direct rebuild would deactivate and re-create
              // the audio session in the middle of whatever handoff the next
              // card's prompt had already started. That is the inaudible-prompt
              // bug this queue exists to prevent, and it would be invisible:
              // `play()` still reports success. Deferred behind a prompt, the
              // debt is settled by the restore before the learner can tap.
              void reopenCapture();
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
                  if (windowId === windowSeqRef.current) options?.onCapturing?.();
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
              options?.handsFree
                ? withHandsFreeBudget(recordingConfigRef.current)
                : recordingConfigRef.current,
              speechGateRef.current,
            );
            voiceBreadcrumb('voice.recorder.arm', { windowId });
          } catch (err) {
            armResolveRef.current = null;
            finishRef.current = null;
            micLevel.set(0);
            const message = err instanceof Error ? err.message : String(err);
            diagMark('mic.window.failed', { message });
            voiceBreadcrumb('voice.recorder.start.failed', { windowId, error: message }, 'warning');
            if (err instanceof MicPermissionDeniedError) {
              resolve({ ok: false, reason: 'permission' });
            } else {
              resolve({ ok: false, reason: 'error', message });
            }
          }
        });
      } finally {
        // Released the instant a window is actually claimed too — from then
        // on `armResolveRef.current !== null` is the authoritative busy
        // signal for the window's own lifetime, so this is a no-op by the
        // time the Promise above is returned. Matters for the early-return
        // paths and for an unexpected throw from either await.
        armClaimRef.current = false;
      }
    },
    [capture, isReady, micLevel, openCapture, reopenCapture, setPlaybackPriority],
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
      voiceBreadcrumb(
        'voice.permission.prewarm.failed',
        { error: err instanceof Error ? err.message : String(err) },
        'warning',
      );
    }
  }, []);

  const isMicStreamOpen = useCallback((): boolean => capture.isOpen, [capture]);

  const value = useMemo<VoiceGradingContextValue>(
    () => ({
      enabled,
      isReady,
      isWarming,
      error: error?.message ?? null,
      acquireEngine,
      offerHotwordGlosses,
      hotwordCount,
      arm,
      cancel,
      stopListening,
      micLevel,
      transcribe,
      prewarmPermission,
      acquireSession,
      setPlaybackPriority,
      isMicStreamOpen,
    }),
    [
      enabled,
      isReady,
      isWarming,
      error,
      acquireEngine,
      offerHotwordGlosses,
      hotwordCount,
      arm,
      cancel,
      stopListening,
      micLevel,
      transcribe,
      prewarmPermission,
      acquireSession,
      setPlaybackPriority,
      isMicStreamOpen,
    ],
  );

  return <VoiceGradingContext value={value}>{children}</VoiceGradingContext>;
};
