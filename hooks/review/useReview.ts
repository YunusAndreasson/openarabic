import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ViewStyle } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONFIG, VERDICT } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { OnboardingStep } from '@/constants/onboarding';
import { fsrsQueries, studyStreakQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { logPromptSilent } from '@/services/voiceTelemetry';
import { useAppSelectorShallow } from '@/store/hooks';

import { useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import { useAudioPreloader } from './useAudioPreloader';
import { watchPromptFinish } from './promptFinishWatcher';
import { useSessionMetrics } from './useSessionMetrics';
import { useTimerCleanup } from '@/hooks/utils';
import { runWhenIdle } from '@/utils/runWhenIdle';
import { useFSRS } from '@/hooks/vocabulary';
import { audioCache } from '@/services/audioCache';
import { simpleAudioService } from '@/services/audioPlayer';
import type { IntervalLabels, SessionMetrics, WordConfidence } from '@/types/review.types';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { resetArmTelemetry } from '@/utils/armTelemetry';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback, warningFeedback } from '@/utils/haptics';
import { markOnboardingStep } from '@/utils/onboardingStorage';
import {
  beginPrompt,
  markCardCurrent,
  recordPromptAbsent,
  recordPromptCut,
  recordPromptFinish,
  recordPromptFinishAudit,
  recordPromptGate,
  recordPromptPlay,
  resetPromptTelemetry,
} from '@/utils/promptTelemetry';
import {
  endDiagSession,
  mark as diagMark,
  setDiagnosticsEnabled,
  setDiagCard,
  span as diagSpan,
  startDiagSession,
} from '@/utils/reviewDiagnostics';
import { generateStorageUrl } from '@/utils/storageUtils';

/** Time tracking for one review session. Local to this hook — nothing else
 *  reads or writes these, and they are a scratchpad, not a shared contract. */
interface ReviewTimeRefs {
  lastProgressUpdate: number;
  lastProcessedWordId: string | null;
}

/** Session-lifecycle latches for one review session. Same rationale as
 *  ReviewTimeRefs: implementation detail of this hook, kept beside it. */
interface ReviewStateRefs {
  maxProgress: number;
  completionTriggered: boolean;
  isUpdatingWord: boolean;
  progressUpdatedForCompletion: boolean;
}

interface UseReviewProps {
  fromRemember?: boolean;
  onClose?: () => void;
  /**
   * Hands the audio session to playback for the prompt and gives it back
   * afterwards, so the Arabic is not played through the quieter
   * `.playAndRecord` route (see VoiceGradingProvider.setPlaybackPriority).
   *
   * Injected rather than pulled from the context here: this hook is otherwise
   * independent of the voice provider, and reaching into it would make every
   * consumer — and every test — need one mounted for a concern that is
   * optional. Absent, the prompt simply plays on whatever session is current.
   */
  setPlaybackPriority?: (playbackOnly: boolean) => Promise<void>;
  /**
   * Is the microphone's input stream open? Read at the instant a prompt plays,
   * for the prompt record only — an open stream while playback is supposed to
   * own the session is the inaudible-prompt bug, and it is the only half of that
   * evidence the app does not infer from its own bookkeeping. Same injection
   * rationale as `setPlaybackPriority`; absent, the field is simply not recorded.
   */
  isMicStreamOpen?: () => boolean;
}

interface UseReviewReturn {
  currentSentence: { wordForm: string };
  currentMeaning: string;
  currentWord?: StudyWord | null;
  showTranslation: boolean;
  /** Whether the current card's answer has been revealed (flipped). */
  revealed: boolean;
  isComplete: boolean;
  /** True when the due query resolved with no cards; not a completed session. */
  isEmpty: boolean;
  isUpdating: boolean;
  isLoading: boolean;
  wordQueue: StudyWord[];
  enrichmentBatches: readonly (readonly StudyWord[])[];
  /** Every word due in this session, fixed at session start. */
  sessionWords: readonly StudyWord[];
  progress: number;
  maxProgress: number;
  /** Remounts only the card presentation after a rejected scheduler transition. */
  gradeRecoveryEpoch: number;
  currentWordKey: string;
  /**
   * The `currentWordKey` whose Arabic prompt has finished playing — or which
   * never had audio to play.
   *
   * Only hands-free arming reads it, and it is the only honest moment to open
   * the microphone: the input stream is dropped for the duration of every
   * prompt (a record-capable session plays the word quiet — see
   * `VoiceGradingProvider.setPlaybackPriority`), so a window opened any earlier
   * would either silence the prompt or record it.
   *
   * Never reset on its own. It is cleared at the top of each card and set only
   * by that card's own run, so a stale value cannot match the new key — which
   * encodes reps — and the gate can only ever be satisfied by a prompt this run
   * actually finished.
   */
  promptAudioDoneKey: string | null;
  /** Flip the current card to its answer (English meaning + audio). Does not advance. */
  revealAnswer: () => void;
  /**
   * Commit the self-grade for the (revealed) card and advance. `fromVoice` skips
   * the reveal guard for the voice auto-advance path (speaking IS the proof).
   * `skipBeat` skips the verdict beat, because a thrown card is already its own
   * confirmation and parking it in mid-air would contradict the throw.
   *
   * Returns whether the grade was ACTED ON. Several guards drop a grade on the
   * floor (an advance already in flight, a restudy hold, an unrevealed card),
   * and the caller has outcome feedback to play only for one that landed —
   * without this it would have to re-implement those guards to know.
   */
  grade: (
    confidence: WordConfidence,
    opts?: { fromVoice?: boolean; skipBeat?: boolean },
  ) => boolean;
  /** Per-grade interval labels ("10m"/"4d") for the current card's grade bar.
   *  `null` when there is no card to label — an empty object used to stand in
   *  for that, which typed as "all three labels" while holding none of them. */
  intervalLabels: IntervalLabels | null;
  handleClose: () => void;
  transparentStyle: AnimatedStyleProp<ViewStyle>;
  sessionMetrics: SessionMetrics;
  handleReplayAudio: () => Promise<void>;
  /** Play an example sentence's audio (explicit user tap only). */
  playSentenceAudio: (storagePath: string) => Promise<void>;
  /** True while a forgotten card is held on its answer face for a restudy beat
   *  instead of advancing. The bottom slot becomes a "Continue" prompt. */
  restudying: boolean;
  /** Leave the restudy hold and commit the pending "Forgot". */
  continueFromRestudy: () => void;
  isAudioPreloading: boolean;
  /** The first card's audio is cached — the session may run. Later cards keep
   *  preloading in the background (see useAudioPreloader). */
  isAudioReady: boolean;
  /** Play the English meaning audio without advancing or flipping the card.
   *  Shared by the manual reveal and the voice-grading miss path (the answer is
   *  shown by the flip / the voice result panel; this just plays the audio). */
  revealMeaningPassive: () => void;
  /** Stop any in-flight playback (e.g. the reveal audio) so the mic can reopen
   *  cleanly on a voice retry without capturing the tail of a spoken answer. */
  stopAudio: () => void;
}

// Timing constants for transitions (milliseconds)
/**
 * Playback options specific to the review lane. Both settings aim at the same
 * thing: the microphone is gated on the Arabic prompt finishing, so every
 * millisecond between "the word ended" and "we know the word ended" is dead air
 * the learner sits through with nothing on screen.
 *
 * - `statusIntervalMs`: the player's default 500 ms tick bounds how quickly
 *   `didJustFinish` can be observed. Review clips run ~0.8-1.8 s (measured), so
 *   half a second of detection lag is a large fraction of a wait we are
 *   actively blocking on. Scoped to this lane — article and playlist playback
 *   gain nothing from a faster tick and would only pay for the extra events.
 * - `readyTimeoutMs`: when a cache download fails, `audioCache.getAudio`
 *   returns the REMOTE url as a fallback, which flips `waitForPlayerReady` onto
 *   its 20 s streaming budget *and* skips the self-heal below (that path is
 *   gated on `localPath !== url`). Twenty seconds of silence is never the right
 *   answer for a one-word prompt: fail fast, let the card continue without
 *   audio, and let the mic open.
 */
const REVIEW_PLAY_OPTIONS = {
  statusIntervalMs: 100,
  readyTimeoutMs: 4000,
  // The voice provider holds this same audio session record-capable for the
  // whole screen. Without this flag every finishing prompt deactivated it under
  // the live microphone — see AudioPlayOptions.keepAudioSessionActive.
  keepAudioSessionActive: true,
} as const;

/**
 * What a `playAudio` call had to do to get there, reported alongside its
 * boolean result. Both fields cost the learner seconds and neither is visible
 * from the outside: a failed play looks the same whether the file was missing,
 * corrupt, or simply refused to load.
 */
export interface PlayAudioDetail {
  /** The file was not in the preload map and had to be resolved on the spot. */
  cacheMissed: boolean;
  /** The invalidate → re-download → retry path ran for this call. */
  healed: boolean;
}

/** Used when no caller supplied one — the prompt plays on the current session. */
const NO_PLAYBACK_PRIORITY = (): Promise<void> => Promise.resolve();

const TRANSITION_DELAYS = {
  /**
   * Card dissolve on advance. Matched to the card's throw so a committed
   * card leaves as one motion; the same fade plays the card back in.
   */
  fadeAnimation: TIMING_CONFIG.CARD_EXIT.duration,
  /**
   * Watchdog for the fade-out completion callback. Reanimated only invokes a
   * withTiming callback with `finished: true` when the animation runs to
   * completion — an interrupted fade would otherwise strand the session at
   * opacity 0 with grading disabled. Generous enough never to pre-empt a
   * healthy fade.
   *
   * Includes the verdict beat: the fade now starts VERDICT.BEAT after the
   * grade on every path but the restudy continue, and a watchdog that ignored the hold
   * would fire mid-beat and advance the card out from under its own
   * confirmation.
   */
  fadeWatchdog: VERDICT.BEAT + TIMING_CONFIG.CARD_EXIT.duration + TIMING_CONFIG.MEDIUM.duration,
  /**
   * Watchdog for the fade-IN, which is armed by a committed grade and released
   * by the next card's arrival (see `pendingFadeInRef`). The release is a
   * layout effect on `currentWordKey`, so it cannot fire if the queue hands
   * back the same key or hands back nothing at all; this is the floor that
   * guarantees the card is never left invisible.
   */
  fadeInWatchdog: TIMING_CONFIG.CARD_EXIT.duration + TIMING_CONFIG.MEDIUM.duration,
};

export function useReview({
  fromRemember,
  onClose,
  setPlaybackPriority,
  isMicStreamOpen,
}: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Open the diagnostics timeline for the lifetime of the screen. Registered
  // before every other effect in this hook so the first card's cache lookups
  // and audio-session setup already fall inside the window; it is closed (and
  // its report printed) by the unmount cleanup at the bottom, which runs last.
  //
  // Development builds only, like the HUD that reads it.
  useEffect(() => {
    setDiagnosticsEnabled(__DEV__);
    startDiagSession({ fromRemember: fromRemember ?? false });
  }, [fromRemember]);

  // Talks to the audio service directly rather than through
  // useSimpleAudioPlayer. This hook only ever *commands* playback — play, stop,
  // preconfigure — and reads no status field, so the subscription it used to
  // hold was pure cost: the review lane runs its player at a 100 ms status
  // interval, so it re-rendered this hook and the entire review screen ten
  // times a second for the whole of every prompt and every reveal.
  //
  // Use optimized opacity animation from hooks/animations
  // animatedStyle uses Reanimated 4 inline shared values (no useAnimatedStyle wrapper)
  const {
    animatedStyle: opacityStyle,
    fadeIn,
    fadeOut,
  } = useOpacityAnimation({
    initialOpacity: 1,
    duration: TRANSITION_DELAYS.fadeAnimation,
  });

  // Timer cleanup hook for managing all setTimeout calls
  const { setTimer, clearTimer, clearAllTimers } = useTimerCleanup();

  // Set by a committed grade, cleared by whichever of the next card's arrival
  // or the watchdog gets there first. Idempotent on both paths.
  const pendingFadeInRef = useRef(false);
  const releasePendingFadeIn = useCallback(() => {
    if (!pendingFadeInRef.current) return;
    pendingFadeInRef.current = false;
    clearTimer('fadeInWatchdog');
    fadeIn();
  }, [fadeIn, clearTimer]);

  // Session metrics tracking hook
  const { metrics: sessionMetrics, updateMetrics } = useSessionMetrics();

  // UI state
  const [showTranslation, setShowTranslation] = useState(false);
  // Reveal-first: the card starts on its question face; the user flips it to the
  // answer (revealAnswer) BEFORE self-grading. Reset to false on every new card.
  const [revealed, setRevealed] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  // Ensure UI re-renders when updating state changes, so the grade bar and the
  // reveal button re-enable once an advance lands
  const [isUpdatingUI, setIsUpdatingUI] = useState(false);
  const [gradeRecoveryEpoch, setGradeRecoveryEpoch] = useState(0);
  // Progress bar high-water mark, surfaced as state so consumers re-render.
  const [maxProgress, setMaxProgress] = useState(0);
  const [promptAudioDoneKey, setPromptAudioDoneKey] = useState<string | null>(null);
  // Holding a forgotten card on its answer face for a restudy beat before it
  // advances.
  //
  // Stored as WHICH CARD is being held rather than a boolean, so the rendered
  // flag below is derived from the current word instead of being reset after
  // the fact. `continueFromRestudy` deliberately leaves the hold flag up
  // through the exit fade (see the comment there), and clearing it used to be
  // the job of the currentWordKey effect — which runs after the paint, so the
  // first frame of the NEXT card rendered "Tap to continue" all over again
  // before it vanished. Keyed, the hold simply stops matching the moment a new
  // word arrives, in the same render that carries it.
  //
  // Still mirrored in a ref because `grade` is a stable callback that must read
  // the live value to know whether it is the interception or the commit.
  const [restudyKey, setRestudyKey] = useState<string | null>(null);
  const restudyRef = useRef(false);

  // Consolidated time tracking refs — initial timestamp captured once via lazy state.
  const [mountTime] = useState(() => Date.now());
  const timeRefs = useRef<ReviewTimeRefs>({
    lastProgressUpdate: mountTime,
    lastProcessedWordId: null,
  });

  // Consolidated state refs
  const stateRefs = useRef<ReviewStateRefs>({
    maxProgress: 0,
    completionTriggered: false,
    isUpdatingWord: false,
    progressUpdatedForCompletion: false,
  });

  // Session tracking refs for analytics
  const sessionStartTime = useRef<number | null>(null);
  const sessionStarted = useRef(false);
  const wordsReviewedCount = useRef(0);
  const totalWordsInSessionRef = useRef(0);

  // Add controller ref for proper cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // A grade the learner has already given whose FSRS write has not started yet.
  //
  // `commitGrade` sequences the write off the card's fade-out completion, so
  // for VERDICT.BEAT + CARD_EXIT (320ms; 180ms on the restudy continue, which skips the
  // beat) the grade exists only as this pending closure. Every teardown path
  // used to cancel it — the AbortController aborts, useOpacityAnimation drops
  // its callback once isMounted goes false, and clearAllTimers kills the
  // watchdog — so `updateWord` was never reached, pendingWritesRef stayed empty
  // and flushPendingWrites had nothing to flush. Closing 154ms and 187ms after
  // a grade both reached the database with nothing, silently: the card had
  // already faded out and the counts stayed self-consistent.
  //
  // Draining this before any teardown is what makes a grade durable.
  const pendingGradeRef = useRef<(() => void) | null>(null);

  // Set once a session teardown has already been finalized, so the close
  // handler and the unmount cleanup don't both schedule the same work.
  const finalizedRef = useRef(false);

  // Up from the first moment the session is on its way out — the ✕ tap, or the
  // unmount for exits that never reach it. The screen stays mounted through
  // the navigation delay and the dismiss animation, and committing a pending
  // grade in that window advances the queue: without this latch the NEXT card
  // faded in and began its Arabic prompt on a screen already leaving.
  const closingRef = useRef(false);

  // Active prompt-finish watcher, keyed by the card it belongs to. Held in a
  // ref (not tied to the audio effect's cleanup) so an incidental re-render
  // mid-prompt can't tear it down.
  const promptWatchRef = useRef<{ key: string; cancel: () => void } | null>(null);

  // Read for the silent-prompt row only, so it can say whether the mic was
  // about to open on a word that was never read. Read through an Effect Event
  // (below) so the prompt effect doesn't re-run just because a setting
  // changed mid-card.
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  // Defaults to a no-op so a caller that does not care (and every test) needs
  // no provider. Plain closure — safe for the non-effect callers below
  // (revealMeaningPassive, enterRestudy, handleReplayAudio), which already
  // pick up the latest `setPlaybackPriority` on every render the normal way.
  const playbackPriority = setPlaybackPriority ?? NO_PLAYBACK_PRIORITY;
  // Effect Event wrapper for the prompt-play effect only: that effect must
  // not re-run just because the provider re-rendered mid-card, which a plain
  // closure (or listing `playbackPriority` as a dep) would force. Only
  // callable from inside an Effect — see the two call sites below.
  const setPlaybackPriorityEvent = useEffectEvent((playbackOnly: boolean) =>
    playbackPriority(playbackOnly),
  );
  const getVoiceEnabled = useEffectEvent(() => voiceEnabled);
  /** Both halves of "what session did this prompt actually play on", sampled
   *  together at the moment it played. See PromptSnapshot for why one is not
   *  enough. Effect Event for the same reason as the handoff above. */
  const getSessionShape = useEffectEvent(() => ({
    sessionRecordCapable: simpleAudioService.isRecordingSessionEnabled,
    micStreamOpen: isMicStreamOpen?.() ?? false,
  }));

  // Monotonic token for playAudio calls. play() returning false can mean the
  // call was superseded by a newer play (or a stop); the cache self-heal retry
  // must only run for the LATEST call, or a stale retry would invalidate a
  // healthy file and hijack the newer playback it lost to.
  const playAudioSeqRef = useRef(0);

  // Utility to stop audio safely
  const stopAudioSafely = useCallback(() => {
    // A user-initiated stop also outdates any pending self-heal retry.
    playAudioSeqRef.current++;
    simpleAudioService.stop().catch(() => {
      // Silent failure
    });
  }, []);

  const triggerCompletionTransition = useCallback(() => {
    if (stateRefs.current.completionTriggered) return;
    stateRefs.current.completionTriggered = true;

    // Stop any playing audio to free resources
    stopAudioSafely();

    stateRefs.current.maxProgress = 100;
    setMaxProgress(100);
  }, [stopAudioSafely]);

  const {
    currentWord,
    isComplete,
    isEmpty,
    progress,
    updateWord,
    previewIntervals,
    invalidateQueries,
    wordQueue,
    enrichmentBatches,
    sessionWords,
    isLoading,
    flushPendingWrites,
  } = useFSRS({
    userId: user?.id,
    onComplete: triggerCompletionTransition,
    sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
  });

  // Audio preloading hook (must come after wordQueue/isComplete from useFSRS)
  const {
    isPreloading: isAudioPreloading,
    isReady: isAudioReady,
    resolveCached,
    forgetCached,
  } = useAudioPreloader(wordQueue, isComplete);

  // Derive currentSentence directly from currentWord (React 19 auto-memoizes)
  const currentSentence = { wordForm: currentWord?.root?.letters ?? '' };

  // Unique key for the current word to trigger renders (React 19 auto-memoizes)
  const currentWordKey = currentWord
    ? `${currentWord.root_id}-${currentWord.fsrs_last_review ?? ''}-${currentWord.fsrs_reps ?? 0}`
    : 'none';

  // Per-grade interval labels ("10m"/"4d") for the grade bar, recomputed per card
  // (currentWord changes on every advance, including a re-queued word reappearing).
  // `previewIntervals` is guarded for partial useFSRS mocks in tests; in production
  // it is always present.
  const intervalLabels = useMemo(
    () => (currentWord ? previewIntervals(currentWord) : null),
    [currentWord, previewIntervals],
  );

  // Snap the card back to its question face the instant a new word arrives.
  //
  // This is React's "adjusting state when a prop changes" pattern — a state
  // update DURING render, guarded by the previous key — and it is load-bearing
  // here rather than a style choice. These three flags used to be reset in the
  // effect below, and an effect cannot run before the paint it is reacting to:
  // the render that first carried the new `currentWord` still had `revealed`
  // true and `currentMeaning` holding the PREVIOUS card's text, so every single
  // advance painted the new Arabic word above the old English meaning before
  // the effect corrected it. Filmed at 30fps on a Pixel emulator, that
  // mismatched pair was on screen for ~230ms — long enough to read.
  //
  // Setting them here re-renders before anything reaches the screen, so the
  // wrong pairing is never painted. The timer/ref cleanup stays in the effect
  // below: side effects can't run during render, and those are not visible.
  // The hold belongs to one card. Derived, so it can never outlive it.
  const restudying = restudyKey !== null && restudyKey === currentWordKey;

  const [syncedWordKey, setSyncedWordKey] = useState(currentWordKey);
  if (syncedWordKey !== currentWordKey) {
    setSyncedWordKey(currentWordKey);
    setShowTranslation(false);
    setRevealed(false);
    setCurrentMeaning('');
  }

  // Bring the card back only once the new word is committed. A layout effect,
  // not a passive one: this runs after the commit that carries the new content
  // but BEFORE the frame is painted, so the card's return and the word it
  // returns with are the same event. A passive effect would paint first, which
  // is the whole class of bug this replaced.
  useLayoutEffect(() => {
    releasePendingFadeIn();
  }, [currentWordKey, releasePendingFadeIn]);

  useEffect(() => {
    // Clear any pending translation timers
    clearTimer('meaningTimeout');

    // A restudy hold belongs to the card that earned it. Clearing both here
    // means an interrupted hold (session close, chunk restart) can never leak
    // into the next card and swallow its first "Forgot".
    //
    // Only the ref drops here. The rendered flag is derived from `restudyKey`
    // above and needs no reset at all — a ref, unlike state, cannot be safely
    // written during render.
    restudyRef.current = false;
    // Reset stale completion flag if a new word/session appears
    if (currentWordKey !== 'none' && stateRefs.current.completionTriggered) {
      stateRefs.current.completionTriggered = false;
    }
  }, [currentWordKey, clearTimer]);

  const recoverRejectedGrade = useCallback(
    (reason: string) => {
      diagMark('grade.rejected', { reason });
      if (finalizedRef.current) return;
      restudyRef.current = false;
      setRestudyKey(null);
      setGradeRecoveryEpoch(epoch => epoch + 1);
      releasePendingFadeIn();
    },
    [releasePendingFadeIn],
  );

  // Process the word update in FSRS
  const processFeedback = useCallback(
    async (confidence: WordConfidence, controller: AbortController) => {
      if (!currentWord?.root_id || controller.signal.aborted) {
        // Release the locks before bailing. This return sits OUTSIDE the
        // try/finally that normally clears them, so taking it used to leave
        // `isUpdatingWord` true forever — and that flag both rejects every
        // later grade in `grade()` and disables the whole grade bar. Since the
        // bar deliberately has no disabled dim, the result was a review screen
        // that looked completely normal and silently ignored every tap.
        stateRefs.current.isUpdatingWord = false;
        setIsUpdatingUI(false);
        releasePendingFadeIn();
        return;
      }

      // Store old stability + reps before update for metrics / telemetry
      const oldStability = currentWord.fsrs_stability ?? undefined;
      const reps = currentWord.fsrs_reps ?? 0;
      const rootId = currentWord.root_id;

      try {
        // Arm BEFORE the await, not after.
        //
        // `updateWord` swaps the next word in synchronously (useFSRS calls
        // setCurrentWord partway through, and only the DB write is deferred),
        // so React can commit the new card while this function is still
        // suspended on the await. Arming afterwards therefore raced the very
        // commit it was waiting for: the layout effect found nothing armed, and
        // the 380ms watchdog became the real path — measured as ~633ms of black
        // between cards on a 30fps capture. Armed here, the release lands on
        // the commit itself.
        //
        // Not while closing: the grade still has to be written, but there is no
        // next card to bring back on a screen that is leaving.
        if (!closingRef.current) {
          pendingFadeInRef.current = true;
          setTimer('fadeInWatchdog', releasePendingFadeIn, TRANSITION_DELAYS.fadeInWatchdog);
        }

        const updateResult = await updateWord(rootId, confidence);
        if (updateResult.status === 'rejected') {
          recoverRejectedGrade(updateResult.reason);
          return;
        }
        const newStability = updateResult.stability;

        // Onboarding is a success signal, so a rejected scheduler transition
        // must not mark the practice step complete.
        void markOnboardingStep(OnboardingStep.PRACTICE_WORD);

        // Increment words reviewed count for analytics
        wordsReviewedCount.current += 1;

        // Per-grade telemetry — the Forgot/Guessed/Knew-it distribution the
        // reveal-first flow is about (the old binary analytics couldn't express it).
        // NOTE: this deliberately does not record which INPUT graded the card —
        // tap and voice are indistinguishable here.
        void analytics.track(ANALYTICS_EVENTS.REVIEW_WORD_GRADED, {
          confidence,
          root_id: rootId,
          old_stability: oldStability,
          new_stability: newStability,
          reps,
        });

        // Update session metrics with old and new stability for accurate tracking
        updateMetrics(confidence, {
          rootId,
          oldStability,
          newStability,
        });

        if (!stateRefs.current.isUpdatingWord) return;

        // FIXED: Check if completion is needed after word processing
        // This ensures completion happens at the right time
        if (isComplete) {
          // Session is already complete, trigger completion transition. Release
          // the armed fade-in rather than leaving it to the watchdog: there is
          // no next card to wait for, and the card's opacity must not be left
          // at 0 for whatever mounts next.
          releasePendingFadeIn();
          triggerCompletionTransition();
          // Word process complete immediately
        }
        // Nothing to do on the normal path: the fade-in was armed before the
        // await and the layout effect on currentWordKey releases it when the
        // next card actually commits.
        //
        // It used to call fadeIn() straight after the await. The opacity is a
        // shared value that lands on the very next UI frame, while React had
        // not yet committed the new word — so the card faded back in still
        // showing the card that was just graded and swapped a few frames later.
        // Filmed at 30fps: ~265ms of the outgoing card at full opacity.
      } catch (error) {
        void handleError(error);
        if (!stateRefs.current.isUpdatingWord) return;
        recoverRejectedGrade('unexpected-error');
      } finally {
        stateRefs.current.isUpdatingWord = false;
        if (!finalizedRef.current) setIsUpdatingUI(false);
        clearTimer('meaningTimeout');
      }
    },
    [
      currentWord?.root_id,
      currentWord?.fsrs_stability,
      currentWord?.fsrs_reps,
      updateWord,
      updateMetrics,
      recoverRejectedGrade,
      releasePendingFadeIn,
      setTimer,
      isComplete,
      triggerCompletionTransition,
      clearTimer,
    ],
  );

  // Enhanced audio playback function for single audio files.
  //
  // The session preloader downloaded every word's audio and remembers where it
  // put each file, so the normal case resolves with a Map lookup and reaches
  // play() without a single await. Asking audioCache again — which is what this
  // did on every prompt, every reveal and every replay — cost three async hops
  // for an answer we already had, plus two synchronous filesystem stats per file
  // once the cache's five-minute memory TTL expired, which any real session
  // outlives. Quick mode still covers the genuine miss: a card reached before
  // the background preload got to it.
  const playAudio = useCallback(
    async (url: string, onResolved?: (detail: PlayAudioDetail) => void) => {
      if (!url) return false;

      // Claim this request before the first asynchronous cache lookup. If an
      // older cold-cache request resumes after a newer card/replay has already
      // started, it must not become "latest" merely because its lookup was
      // slower and replace the audio the learner just asked for.
      const seq = ++playAudioSeqRef.current;

      const preloaded = resolveCached(url);
      // Reported rather than inferred: a play-time cache miss and a cache
      // self-heal both cost seconds, and from the outside they look identical
      // to a player that simply refused to load.
      const detail: PlayAudioDetail = { cacheMissed: preloaded === undefined, healed: false };
      const report = (started: boolean): boolean => {
        onResolved?.(detail);
        return started;
      };
      const makeTrack = (audioUrl: string) => ({
        id: `review-${Date.now()}`,
        audioUrl,
        title: 'Review Audio',
      });

      try {
        const localPath = preloaded ?? (await audioCache.getAudio(url, { quick: true }));
        if (playAudioSeqRef.current !== seq) return report(false);

        const success = await simpleAudioService.play(makeTrack(localPath), REVIEW_PLAY_OPTIONS);
        if (success) return report(true);

        // false can also mean this play was superseded by a newer play/stop —
        // in that case the file is fine and retrying would hijack the newer
        // playback. Only the latest call may self-heal.
        if (playAudioSeqRef.current !== seq) return report(false);

        // A cached copy that fails to load is almost always a corrupt/partial
        // download poisoning the cache — without purging it, this word would
        // stay silent in every future session. Re-fetch once and retry. The
        // remembered path goes too, or the retry would resolve straight back to
        // the file we just deleted.
        if (localPath !== url) {
          detail.healed = true;
          forgetCached(url);
          await audioCache.invalidate(url);
          const freshPath = await audioCache.getAudio(url, { quick: true });
          if (playAudioSeqRef.current !== seq) return report(false);
          return report(await simpleAudioService.play(makeTrack(freshPath), REVIEW_PLAY_OPTIONS));
        }
        return report(false);
      } catch (error) {
        void handleError(error);
        return report(false);
      }
    },
    [resolveCached, forgetCached],
  );

  /**
   * Take the audio session back from the microphone, then play `url` — but only
   * if the card that asked for it is still the current one.
   *
   * The handoff is AWAITED, not fired alongside the play: until the input stream
   * is actually closed the audio plays on the quiet `.playAndRecord` route.
   * Racing the two lost — the answer began while the microphone was still open,
   * which is exactly what it sounded like.
   *
   * The card check is the other half. `simpleAudioService.play()` resolves
   * purely by call order and has no notion of which card a call belongs to, so a
   * handoff still in flight when the card moves on (a fast restudy "Continue", a
   * grade) would hijack whatever the next card is already playing.
   *
   * Three call sites pasted this guard; two carried a comment pointing back at
   * the first. Resolves `false` when the card changed, so callers can tell "did
   * not play" from "played".
   */
  const playAfterHandoff = useCallback(
    (url: string): Promise<boolean> => {
      const keyAtRequest = timeRefs.current.lastProcessedWordId;
      return playbackPriority(true)
        .catch(handleError)
        .then(() => {
          if (timeRefs.current.lastProcessedWordId !== keyAtRequest) return false;
          return playAudio(url);
        });
    },
    [playAudio, playbackPriority],
  );

  // Disclose the English meaning without advancing or flipping the card: set
  // the text and play its audio. Shared by the manual reveal (revealAnswer,
  // which flips as well) and the voice-grading miss path (onRevealAnswer, which
  // shows it under the Arabic on the question face).
  //
  // It used to be audio only, on the grounds that the flip or the result panel
  // showed the text. The panel no longer does — the answer moved onto the card,
  // where it reads at the size the answer face gives it — so the one function
  // that means "the answer is now disclosed" has to own the text too. Without
  // it the card had an empty `answer` on every voice miss.
  const revealMeaningPassive = useCallback(() => {
    if (stateRefs.current.isUpdatingWord || isComplete || stateRefs.current.completionTriggered) {
      return;
    }
    setCurrentMeaning(currentWord?.root?.meaning || STRINGS.NO_TRANSLATION_AVAILABLE);
    if (currentWord?.root?.audio_url_en) {
      const englishAudioUrl = generateStorageUrl('audio', currentWord.root.audio_url_en);
      if (englishAudioUrl) {
        // The answer is spoken AFTER the microphone has taken its session back
        // (markDone restores it at the end of the prompt), so without this it
        // plays on the quiet .playAndRecord route. There is no finish event to
        // hand the session back on, so the microphone reclaims it itself when
        // the learner next taps — see arm() in VoiceGradingProvider.
        // The English play supersedes the Arabic prompt. Recorded before it
        // starts, because from the watcher's side the teardown that follows is
        // indistinguishable from a player that died on its own.
        recordPromptCut('reveal');
        const endMeaningPlay = diagSpan('meaning.play');
        playAfterHandoff(englishAudioUrl)
          .then(started => endMeaningPlay({ started: started ?? false }))
          .catch(err => {
            endMeaningPlay({ started: false, error: true });
            void handleError(err);
          });
      }
    }
  }, [currentWord, isComplete, playAfterHandoff]);

  // Reveal the answer: flip the card, show the English meaning persistently and
  // play the English audio. Does NOT advance — the user self-grades next. Setting
  // showTranslation also suppresses the Arabic-replay effect (guarded on it), so
  // revealing never retriggers the prompt audio.
  const revealAnswer = useCallback(() => {
    if (stateRefs.current.isUpdatingWord || isComplete || stateRefs.current.completionTriggered) {
      return;
    }
    if (revealed) return; // idempotent — tapping the card twice flips once
    // Haptic first: the tap's physical response should lead the flip, not queue
    // behind the audio-cache lookup kicked off below.
    //
    // Tier 0 (see utils/haptics). Revealing asks a question — it decides
    // nothing, grades nothing and can be done on every card without cost. It
    // must not land harder than the grade that follows it seconds later.
    selectionFeedback();
    setRevealed(true);
    setCurrentMeaning(currentWord?.root?.meaning || STRINGS.NO_TRANSLATION_AVAILABLE);
    setShowTranslation(true);
    revealMeaningPassive();
  }, [revealed, isComplete, currentWord?.root?.meaning, revealMeaningPassive]);

  // Commit the self-grade for the revealed card and advance. The answer is
  // already on screen, so this is a clean fade-out → FSRS write → next card
  // (no meaning overlay, no English replay). `fromVoice` skips the reveal guard
  // for the voice auto-advance path (speaking the answer IS the proof).
  const commitGrade = useCallback(
    (confidence: WordConfidence, opts: { fromVoice?: boolean; skipBeat?: boolean } = {}) => {
      diagMark('grade', { confidence, fromVoice: opts.fromVoice ?? false });
      stateRefs.current.isUpdatingWord = true;
      setIsUpdatingUI(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Stop the reveal (English) audio before advancing so it doesn't bleed
      // into the next card. Immediate: the grade is already committed, and the
      // old 120ms lead-in was dead time on every single card (~2s per 20-card
      // chunk) during which nothing moved.
      stopAudioSafely();

      // The advance is sequenced off the fade-out's OWN completion callback
      // rather than a setTimeout guessing its duration. The two used to be
      // independent clocks — a UI-thread animation and a JS-thread timer — so
      // under load the timer drifted and the card sat blank past the fade.
      // Note: session metrics are updated in processFeedback after FSRS
      // calculation (it has both old and new stability for accurate tracking).
      let advanced = false;
      const advance = () => {
        if (advanced || controller.signal.aborted) return;
        advanced = true;
        pendingGradeRef.current = null;
        clearTimer('fadeAnimation');
        void processFeedback(confidence, controller);
      };

      // Registered before the fade starts, so a close landing inside the fade
      // window can still commit this grade (see pendingGradeRef).
      pendingGradeRef.current = advance;

      // Hold the card at full strength for the verdict beat before dissolving
      // it, so the confirmation is legible on its own. The dissolve is
      // Easing.out — fastest off the mark — so a verdict painted at grade time
      // was under 30% opacity within three frames and never read at all.
      //
      // The restudy continue is exempt. Its verdict has been sitting on the card
      // for the whole hold — a far longer moment than the beat buys — and the
      // screen starts the card's left exit on the same tap, so holding again
      // would only desync the fade from the throw.
      //
      // The delay goes INSIDE the animation (withDelay), not in a timer before
      // it. Two clocks drift, and the sequencing below depends on the fade's
      // own completion callback landing when the fade actually lands.
      const beatMs = opts.skipBeat ? 0 : VERDICT.BEAT;
      fadeOut(advance, beatMs);
      setTimer('fadeAnimation', advance, TRANSITION_DELAYS.fadeWatchdog);
    },
    [fadeOut, processFeedback, setTimer, clearTimer, stopAudioSafely],
  );

  /**
   * Grade the current card — with one interception.
   *
   * A forgotten word used to dissolve straight into the next card and come back
   * three cards later with nothing learned in between. The moment immediately
   * after a failed retrieval is when re-encoding is most effective, and spending
   * it on a 180 ms fade throws it away. So "Forgot" first holds the card on its
   * answer face with the meaning and an example, replays the Arabic, and waits
   * for a tap.
   *
   * The interception sits BEFORE any of the advance machinery on purpose: the
   * re-entrancy lock, the fade-callback sequencing, the threefold completion
   * guard and the drill requeue all run exactly as they did, just later. Holding
   * the card *after* `updateWord()` would not work — `currentWord` has already
   * moved on by then.
   *
   * At the 0.90 retention target this fires on roughly one card in ten.
   */
  /** Put the card into the restudy hold: show the answer and replay the Arabic. */
  const enterRestudy = useCallback(
    (fromVoice: boolean) => {
      restudyRef.current = true;
      setRestudyKey(currentWordKey);
      diagMark('restudy.enter', { fromVoice });
      // The voice path never flips the card (its result panel is the answer
      // surface), so a miss can arrive here still on the question face. Show
      // the answer before asking the learner to study it.
      setRevealed(true);
      setCurrentMeaning(currentWord?.root?.meaning || STRINGS.NO_TRANSLATION_AVAILABLE);
      setShowTranslation(true);
      // Replay the Arabic rather than the English: pairing the form the learner
      // failed on with the meaning now in front of them is the association
      // worth strengthening. Setting showTranslation above suppresses the
      // automatic prompt-replay effect, so this is the only playback that fires.
      const audioPath = currentWord?.root?.audio_url;
      if (!audioPath) return;
      const replayUrl = generateStorageUrl('audio', audioPath);
      if (replayUrl) {
        recordPromptCut('reveal');
        playAfterHandoff(replayUrl).catch(handleError);
      }
    },
    [currentWordKey, currentWord?.root?.meaning, currentWord?.root?.audio_url, playAfterHandoff],
  );

  const grade = useCallback(
    (confidence: WordConfidence, opts: { fromVoice?: boolean; skipBeat?: boolean } = {}) => {
      if (stateRefs.current.isUpdatingWord || isComplete || stateRefs.current.completionTriggered) {
        return false;
      }
      // Grading only happens after the answer is revealed — except a voice match,
      // which confirms the answer without an on-screen reveal.
      if (!revealed && !opts.fromVoice) return false;

      // While a restudy hold is up the grade is already decided; only the tap
      // that leaves the hold may commit it. Without this a second "Forgot"
      // arriving during the hold fell straight through to the commit and wrote
      // the card twice (caught by useReview.grade.test).
      if (restudyRef.current) return false;

      // Graded while the prompt was still playing — the learner answered
      // without hearing the whole word. A no-op once it has finished.
      recordPromptCut('advance');

      if (confidence === 'unknown') {
        enterRestudy(opts.fromVoice ?? false);
        return true;
      }

      commitGrade(confidence, opts);
      return true;
    },
    [revealed, isComplete, commitGrade, enterRestudy],
  );

  /** Leave the restudy hold and actually commit the "Forgot". */
  const continueFromRestudy = useCallback(() => {
    if (!restudyRef.current) return;
    // Only the ref drops here — it is the re-entry guard, and a second tap
    // during the exit must be a no-op. The UI flag deliberately stays up until
    // the next card arrives (the currentWordKey effect clears it): the bottom
    // band picks restudy → voice → revealed → reveal, and `revealed` is still
    // true for this card, so clearing `restudying` now swapped "Continue" for
    // the grade bar for the whole exit fade — offering three buttons the
    // learner never had, on a card already on its way out.
    restudyRef.current = false;
    diagMark('restudy.continue');
    // Tier 0. "Continue" ends a pause; the grade it commits was decided — and
    // buzzed at tier 3 — before the hold began. Anything louder here would
    // report the miss a second time.
    selectionFeedback();
    // No beat. The verdict fired when the miss was graded and its ring has been
    // sitting on this card for the whole hold — a longer moment than the beat
    // could ever buy. Holding again here would also desync the fade from the
    // card's own left exit, which the screen starts on this same tap.
    commitGrade('unknown', { skipBeat: true });
  }, [commitGrade]);

  // Effect: Handle completion transition
  useEffect(() => {
    if (isComplete && !stateRefs.current.completionTriggered) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      // Ensure any remaining audio is stopped
      stopAudioSafely();
    }
  }, [isComplete, triggerCompletionTransition, stopAudioSafely]);

  // Effect: Update progress bar
  useEffect(() => {
    if (!isComplete && progress !== undefined) {
      const now = Date.now();
      if (now - timeRefs.current.lastProgressUpdate < 100) {
        return;
      }

      const safeProgress = Math.min(100, Math.max(0, progress));
      if (safeProgress > stateRefs.current.maxProgress) {
        stateRefs.current.maxProgress = safeProgress;
        setMaxProgress(safeProgress);
        timeRefs.current.lastProgressUpdate = now;
      }
    }
  }, [isComplete, progress]);

  // Effect: Ensure 100% progress on completion
  useEffect(() => {
    // Skip if we've already updated
    if (isComplete && !stateRefs.current.progressUpdatedForCompletion) {
      stateRefs.current.maxProgress = 100;
      setMaxProgress(100);
      stateRefs.current.progressUpdatedForCompletion = true;
    }

    // Reset the flag when completion state changes
    if (!isComplete) {
      stateRefs.current.progressUpdatedForCompletion = false;
    }
  }, [isComplete]);

  // Effect: Initialize audio session when practice starts and track session start.
  // Runs ONCE per session — wordQueue.length changes on every graded card, so
  // without the sessionStarted guard, stopAudioSafely() would race with each new
  // word's playback and intermittently silence the audio after a grade.
  useEffect(() => {
    if (sessionStarted.current) return;
    if (wordQueue.length === 0 || isComplete) return;

    // Stop any existing audio from other sessions (like listen tab)
    stopAudioSafely();

    // Pre-configure audio session in background to reduce first audio delay
    simpleAudioService.preconfigureAudioSession().catch(() => {
      // Ignore pre-configuration errors - session will be configured on first play
    });

    sessionStarted.current = true;
    sessionStartTime.current = Date.now();
    totalWordsInSessionRef.current = wordQueue.length;
    void analytics.track(ANALYTICS_EVENTS.REVIEW_SESSION_STARTED, {
      word_count: wordQueue.length,
      source: 'practice_tab',
    });
  }, [wordQueue.length, isComplete, stopAudioSafely]);

  /**
   * Stamp the moment this card became the current one — deliberately ahead of
   * the prompt effect below and behind none of its gates.
   *
   * The prompt effect cannot do this itself: it returns early while the audio
   * preloader is still working, so anything it measures starts after the wait.
   * A learner who says "I waited two seconds for the Arabic" is describing this
   * window, and measuring from the play call reported it as 50 ms.
   */
  useEffect(() => {
    if (!currentWord?.root || currentWordKey === 'none') return;
    markCardCurrent(currentWordKey);
  }, [currentWordKey, currentWord?.root]);

  // Effect: Handle current word changes and play audio (simplified - no more loading).
  // Guard against re-firing for the same word: this effect's deps include
  // showTranslation, which flips false at the same ~3s moment processFeedback
  // runs in the Forgot → restudy → Continue flow. Since updateWord is async, currentWord
  // doesn't update synchronously — without the lastProcessedWordId check, the
  // OLD word's Arabic audio briefly replays before the new word's audio starts.
  useEffect(() => {
    if (stateRefs.current.completionTriggered || isComplete || closingRef.current) {
      return;
    }

    if (!currentWord?.root) {
      return;
    }

    if (showTranslation) {
      recordPromptGate(currentWordKey, 'revealed');
      return;
    }

    // Gated on the FIRST card's audio only. Later cards' files are still
    // downloading in the background; playAudio's quick mode (below) covers the
    // rare case where the user reaches a card before its file has landed.
    if (isAudioPreloading || !isAudioReady) {
      // The silent-wait gate. Recorded because the card is on screen and mute
      // while this holds, and nothing downstream can see that it happened.
      recordPromptGate(currentWordKey, 'preload');
      return;
    }

    // currentWordKey changes on each FSRS update (includes fsrs_last_review +
    // fsrs_reps), so a word reappearing later in the session still re-plays.
    if (timeRefs.current.lastProcessedWordId === currentWordKey) {
      return;
    }
    timeRefs.current.lastProcessedWordId = currentWordKey;

    const keyForRun = currentWordKey;
    setDiagCard(keyForRun);
    diagMark('card.show', { rootId: currentWord.root_id });

    // Clear before this card's own prompt runs. The key encodes reps, so a value
    // left from a previous card practically never collides — but "practically
    // never" is the wrong guarantee for the flag that decides whether a live
    // microphone opens over the Arabic.
    setPromptAudioDoneKey(null);

    // Cancel a still-running watcher from a previous card before this one's.
    if (promptWatchRef.current && promptWatchRef.current.key !== keyForRun) {
      promptWatchRef.current.cancel();
      promptWatchRef.current = null;
    }

    // The card advanced if lastProcessedWordId no longer points at this run.
    const movedOn = (): boolean => timeRefs.current.lastProcessedWordId !== keyForRun;
    const markDone = (): void => {
      // Give the microphone its session back the moment the word is over —
      // before the learner can tap, so the tap still lands on a live stream.
      //
      // Not awaited here, but not dropped either: the provider holds this
      // promise and `arm()` joins it, so a tap that beats the hand-back waits
      // for THIS restore rather than starting a competing one. Awaiting it here
      // instead would only delay the gate that lets the learner tap at all.
      void setPlaybackPriorityEvent(false).catch(handleError);
      if (promptWatchRef.current?.key === keyForRun) promptWatchRef.current = null;
      // A stale watcher (the card already advanced) would publish an old key,
      // which hands-free arming harmlessly ignores — but skip the re-render.
      if (movedOn()) return;
      diagMark('prompt.done');
      setPromptAudioDoneKey(keyForRun);
    };

    // Opens this card's prompt record. Everything below reports into it, and
    // whatever telemetry row this card eventually writes carries the result.
    beginPrompt(keyForRun);

    const audioUrl = generateStorageUrl('audio', currentWord.root.audio_url);
    if (!audioUrl) {
      // No prompt to play — let the mic arm immediately for this card. Deferred
      // off the effect body so it isn't a synchronous cascading setState.
      diagMark('prompt.none');
      recordPromptAbsent(keyForRun);
      void Promise.resolve().then(markDone);
      return;
    }

    // The prompt is about to play: take the session off .playAndRecord so the
    // word is at full volume. Awaited inside the play chain below rather than
    // here, so a slow session change shows up in `toAudibleMs` instead of
    // hiding in an unmeasured gap.
    const rootIdForRun = currentWord.root_id;
    const expectedForRun = currentWord.root.meaning ?? null;
    const playStartedAt = Date.now();
    const endPromptPlay = diagSpan('prompt.play');
    let playDetail: PlayAudioDetail = { cacheMissed: false, healed: false };
    setPlaybackPriorityEvent(true)
      .catch(handleError)
      .then(() =>
        playAudio(audioUrl, detail => {
          playDetail = detail;
        }),
      )
      .then(started => {
        const playMs = Date.now() - playStartedAt;
        endPromptPlay({ started, movedOn: movedOn() });
        // Read at the moment the prompt played, not later: a prompt that ran on
        // a record-capable session — or with the input stream still open, which
        // is the same thing said by the native side — is the "I hear nothing"
        // card, and these are the only fields that say so. See PromptSnapshot.
        recordPromptPlay(keyForRun, { started, playMs, ...playDetail, ...getSessionShape() });
        if (movedOn()) return;
        // Playback didn't start (cache miss / play failure) — don't strand the
        // voice mic waiting; let it arm now.
        if (!started) {
          // The silent card. It throws nothing and consumes no attempt, so this
          // row was the only trace it ever left — see logPromptSilent. From the
          // learner's side it is a card that simply never speaks, with no way to
          // tell that from a word whose audio is genuinely missing. A warning
          // buzz at least marks it as something going wrong rather than as the
          // app waiting on them.
          warningFeedback();
          void logPromptSilent({
            rootId: rootIdForRun,
            expected: expectedForRun,
            playMs,
            voiceEnabled: getVoiceEnabled(),
            meta: { cacheMissed: playDetail.cacheMissed, healed: playDetail.healed },
          });
          markDone();
          return;
        }
        promptWatchRef.current = {
          key: keyForRun,
          cancel: watchPromptFinish(
            outcome => {
              recordPromptFinish(keyForRun, outcome);
              markDone();
            },
            movedOn,
            undefined,
            // Runs after the prompt is already done as far as the session is
            // concerned; it only settles whether the player's own finish event
            // exists on this platform or merely arrives too late to win.
            audit => recordPromptFinishAudit(keyForRun, audit),
          ),
        };
      })
      .catch(err => {
        endPromptPlay({ started: false, error: true });
        recordPromptPlay(keyForRun, {
          started: false,
          playMs: Date.now() - playStartedAt,
          ...playDetail,
          ...getSessionShape(),
        });
        void handleError(err);
        markDone();
      });
  }, [
    currentWord,
    currentWordKey,
    isComplete,
    showTranslation,
    playAudio,
    isAudioPreloading,
    isAudioReady,
  ]);

  // Session completion is owned by useFSRS. A missing card can also mean
  // an empty queue or initialization, so elapsed time cannot prove completion.

  // Replay audio for current word (passed to WordDisplay via ReviewFlipCard).
  // playAudio → service.play() disposes any existing player and creates a
  // fresh one per track (see createFreshPlayer in audioPlayer), so an explicit
  // stop() here would be redundant — teardown is part of play().
  const handleReplayAudio = useCallback(async () => {
    if (!currentWord?.root?.audio_url) return;

    const audioUrl = generateStorageUrl('audio', currentWord.root.audio_url);
    if (audioUrl) {
      // Replaying the same word supersedes an in-flight prompt with itself:
      // the learner heard part of it, then asked for it again.
      recordPromptCut('replay');
      playAfterHandoff(audioUrl).catch(handleError);
    }
  }, [currentWord, playAfterHandoff]);

  /**
   * Play the current card's prompt again after the app comes back.
   *
   * A prompt cut short by an interruption — a call, Siri, another app taking
   * the audio session — leaves the card on screen and permanently silent. The
   * prompt effect is one-shot per `currentWordKey` (see `lastProcessedWordId`),
   * and that key does not change while the app is away, so returning to the
   * session replays nothing. Field telemetry caught it exactly: one card
   * carried its ORIGINAL prompt record (`audibleMs: 1109`, `playMs: 22`) across
   * a 3.5-minute call and into three failed arms afterwards, with no second
   * playback of any kind and no row of its own, because the effect returned
   * before it could log one.
   *
   * Unconditional for an unanswered card rather than gated on "was the prompt
   * actually cut", because nothing downstream can tell. An interruption stalls
   * the play head, so the watcher's wall-clock backstop settles as `reachedEnd`
   * and the card records `heardInFull: true` for a word the learner never
   * heard. Replaying on return is the right behaviour regardless — coming back
   * to a card you were part-way through and hearing the word is what you want.
   *
   * Routed through `handleReplayAudio`, the same path as the replay button, so
   * it takes playback priority and supersedes cleanly. Deliberately NOT done by
   * clearing `lastProcessedWordId`: re-entering the prompt effect for a card it
   * has already run would leave the first run's finish watcher alive on the same
   * key, and that watcher's `markDone` hands the audio session back — under the
   * replay it would then be racing.
   */
  const resumePromptAfterReturn = () => {
    if (isComplete || stateRefs.current.completionTriggered || closingRef.current) return;
    if (!currentWord?.root?.audio_url) return;
    // The answer is already up: the recall test is over and the reveal path
    // does its own playback.
    if (showTranslation) return;
    diagMark('prompt.resume');
    void handleReplayAudio();
  };

  useResumeFromBackground(resumePromptAfterReturn);

  /**
   * Play an example sentence's audio. Explicitly user-initiated only — it is
   * never preloaded and never auto-plays, so the session keeps its property of
   * making no background network calls (a warm session is `net: 0`; the debug
   * HUD turns red otherwise). A tap that has to fetch is the learner's choice.
   */
  const playSentenceAudio = useCallback(
    async (storagePath: string) => {
      const audioUrl = generateStorageUrl('audio', storagePath);
      if (audioUrl) {
        playAudio(audioUrl).catch(handleError);
      }
    },
    [playAudio],
  );

  // No haptic here. Every route into this — the header's close button, the
  // completion screen's Continue, "Review N more" — is a control that owns its
  // own press feedback, and ThemedButton already fires one. Firing again here
  // meant Continue buzzed twice in the same tick, hidden only by the 50ms
  // per-pattern debounce. The haptic belongs to the control, not to the exit.
  /**
   * Everything a session owes the rest of the app on its way out, on EVERY exit
   * path: commit a grade still waiting on the fade, settle the writes, then let
   * the practice screen refetch behind them.
   *
   * Idempotent. `handleClose` calls it for the ✕ button; the unmount cleanup
   * calls it for exits that never reach `handleClose` — Android's back button
   * and back gesture, or a parent navigation — which previously persisted the
   * grade but left every ['fsrs-words'] entry untouched, so the practice
   * screen kept showing pre-session counts for up to the 60s staleTime.
   *
   * A restudy hold is a second flavour of "decided but unwritten": tapping
   * "Forgot" already committed the learner to the grade — the hold only buys
   * a beat to look at the answer before it advances — so an exit before "Tap
   * to continue" must write it too. Without this, closing (or backing out of)
   * a session on a held card discarded the Forgot entirely and left the word
   * showing as untouched in the next session, silently contradicting what the
   * learner was just shown on screen. There is no pendingGradeRef for this
   * case — enterRestudy never reaches commitGrade — so it is handled directly
   * rather than through the fade-driven commitGrade/advance path, which has
   * no card left to animate once the screen is on its way out.
   */
  const commitPendingGrade = useCallback((): boolean => {
    if (restudyRef.current) {
      restudyRef.current = false;
      setRestudyKey(null);
      diagMark('restudy.interrupted');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      stateRefs.current.isUpdatingWord = true;
      void processFeedback('unknown', controller);
      return true;
    }

    const pendingGrade = pendingGradeRef.current;
    pendingGradeRef.current = null;
    pendingGrade?.();
    return pendingGrade !== null;
  }, [processFeedback]);

  const finalizeSession = useCallback(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    // Read NOW, not in the `.then` below: on the unmount path the cleanup that
    // called this zeroes the counter before the flush resolves.
    const committedOnExit = commitPendingGrade();
    const hadGrades = committedOnExit || wordsReviewedCount.current > 0;

    // The flush must complete even though this closure outlives the screen.
    //
    // Guarded because this is the FIRST step of the unmount cleanup: abort,
    // timer cleanup, telemetry reset and the abandonment event all run after
    // it, and a throw here would take every one of them down with it. A real
    // failure still surfaces rather than being swallowed.
    try {
      void flushPendingWrites()
        .then(() => {
          invalidateQueries();

          // CompletionScreen's useReviewCompletion is the only thing that sets
          // lastCompletedAtKey and refreshes the streak, and it only mounts on
          // the natural "ran out of due cards" path — an early exit (✕ button,
          // Android back) never reaches it, so the streak and the due-cooldown
          // window silently stayed on yesterday's values. Every exit owes the
          // rest of the app the same freshness natural completion does.
          //
          // Only for a session that graded something. Opening review and
          // closing it again is not a completed session, and stamping one
          // started the cooldown anyway — which the reminder planner reads as
          // "just practised" and drops the next slot for. useReviewCompletion
          // has always held the same line.
          if (user?.id && hadGrades) {
            queryClient.setQueryData(fsrsQueries.lastCompletedAtKey(user.id), Date.now());
            void studyStreakQueries.invalidateAll(queryClient, user.id);
          }
        })
        .catch(handleError);
    } catch (error) {
      void handleError(error);
    }
  }, [commitPendingGrade, flushPendingWrites, invalidateQueries, queryClient, user]);

  // Held in a ref so the unmount cleanup can call it without taking it as a
  // dependency — that effect must stay mount/unmount-only (see its own note).
  const finalizeSessionRef = useRef(finalizeSession);
  useEffect(() => {
    finalizeSessionRef.current = finalizeSession;
  }, [finalizeSession]);

  const handleClose = () => {
    closingRef.current = true;

    // Stop any playing audio when closing
    stopAudioSafely();

    // Before anything can tear the screen down: commit a grade still waiting on
    // the card's fade-out. Synchronous on purpose — it only kicks off a
    // background write, and deferring it is exactly how it used to get lost.
    commitPendingGrade();

    // Defer query invalidation until after navigation animation completes.
    // invalidateQueries → fsrsQueries.invalidateAll prefix-invalidates every
    // ['fsrs-words', userId] entry (all/due/cooldown variants) with the
    // skipToken-guard predicate, and active observers refetch on their own —
    // manual refetchQueries here would only ABORT those fetches and restart
    // them (cancelRefetch defaults to true).
    //
    // Grades persist in the background (see useFSRS.updateWord), so the last
    // card's write may still be in flight as the screen closes. Settle those
    // first or the refetch can overtake them and repopulate the practice screen
    // with pre-grade data. The flush must complete even though this closure
    // outlives the screen.
    runWhenIdle(() => {
      finalizeSession();
    });

    // Schedule navigation with timer cleanup
    setTimer(
      'navigation',
      () => {
        if (onClose) {
          onClose();
        } else if (fromRemember || !router.canDismiss()) {
          // `canDismiss` is false when the session is the only screen on the
          // stack — opened from a reminder notification or a link while the app
          // was closed. `dismiss()` is a no-op there, which left the ✕ and the
          // completion screen's "Continue" both doing nothing.
          router.replace(ROUTE_PATHS.PRACTICE_TAB);
        } else {
          router.dismiss();
        }
      },
      100,
    );
  };

  // Unmount-only cleanup: tracks abandonment, aborts in-flight work, resets refs.
  // Deps must NOT include wordQueue.length — useFSRS.updateWord shrinks the queue
  // on every graded card, so a length dep here would re-fire this cleanup mid-session,
  // double-firing analytics, racing stopAudioSafely() against the new word's
  // playAudio() in the audio-play effect, and clobbering session state.
  useEffect(() => {
    return () => {
      // FIRST, before the abort below can cancel it: persist a grade still
      // waiting on the fade and leave the caches consistent. This is the only
      // hook exits that never reach `handleClose` have — Android's back button
      // and back gesture, or a parent navigation. Idempotent, so the ✕ path
      // (which already finalized) falls straight through.
      closingRef.current = true;
      finalizeSessionRef.current();

      if (
        sessionStarted.current &&
        !stateRefs.current.completionTriggered &&
        sessionStartTime.current
      ) {
        const sessionDurationMs = Date.now() - sessionStartTime.current;
        const wordsRemaining = totalWordsInSessionRef.current - wordsReviewedCount.current;

        void analytics.track(ANALYTICS_EVENTS.REVIEW_SESSION_ABANDONED, {
          words_reviewed: wordsReviewedCount.current,
          words_remaining: Math.max(0, wordsRemaining),
          session_duration_ms: sessionDurationMs,
        });
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Cancel any in-flight prompt-finish watcher so its interval/subscription
      // doesn't outlive the screen.
      promptWatchRef.current?.cancel();
      promptWatchRef.current = null;

      stateRefs.current.completionTriggered = true;
      stateRefs.current.progressUpdatedForCompletion = false;

      stopAudioSafely();
      clearAllTimers();

      stateRefs.current.isUpdatingWord = false;
      stateRefs.current.maxProgress = 0;
      timeRefs.current.lastProcessedWordId = null;
      timeRefs.current.lastProgressUpdate = Date.now();

      sessionStarted.current = false;
      sessionStartTime.current = null;
      wordsReviewedCount.current = 0;

      // The card in flight is gone with the screen; without this its prompt
      // would still answer to `getPromptSnapshot` and ride into the next
      // session's first telemetry row.
      resetPromptTelemetry();
      resetArmTelemetry();

      // Last cleanup registered in this hook, so the printed report includes
      // every teardown step above it.
      endDiagSession();
    };
  }, [stopAudioSafely, clearAllTimers]);

  return {
    currentSentence,
    currentMeaning,
    currentWord,
    showTranslation,
    revealed,
    isComplete,
    isEmpty,
    isUpdating: isUpdatingUI,
    isLoading,
    wordQueue,
    enrichmentBatches,
    sessionWords,
    progress,
    maxProgress,
    gradeRecoveryEpoch,
    currentWordKey,
    promptAudioDoneKey,
    revealAnswer,
    grade,
    intervalLabels,
    handleClose,
    transparentStyle: opacityStyle,
    sessionMetrics,
    handleReplayAudio,
    playSentenceAudio,
    restudying,
    continueFromRestudy,
    isAudioPreloading,
    isAudioReady,
    revealMeaningPassive,
    stopAudio: stopAudioSafely,
  };
}
