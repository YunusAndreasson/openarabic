import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { InteractionManager } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONFIG, VERDICT } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { logPromptSilent } from '@/services/voiceTelemetry';
import { useAppSelectorShallow } from '@/store/hooks';

import { useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth';
import { useAudioPreloader } from './useAudioPreloader';
import { watchPromptFinish } from './promptFinishWatcher';
import { useSessionMetrics } from './useSessionMetrics';
import { useTimerCleanup } from '@/hooks/utils';
import { useFSRS } from '@/hooks/vocabulary';
import { audioCache } from '@/services/audioCache';
import { simpleAudioService } from '@/services/audioPlayer';
import type {
  ReviewStateRefs,
  ReviewTimeRefs,
  SessionMetrics,
  WordConfidence,
} from '@/types/review.types';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { resetArmTelemetry } from '@/utils/armTelemetry';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback, warningFeedback } from '@/utils/haptics';
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
  setDiagCard,
  span as diagSpan,
  startDiagSession,
} from '@/utils/reviewDiagnostics';
import { generateStorageUrl } from '@/utils/storageUtils';

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
}

interface UseReviewReturn {
  currentSentence: { wordForm: string };
  currentMeaning: string;
  currentWord?: StudyWord | null;
  showTranslation: boolean;
  /** Whether the current card's answer has been revealed (flipped). */
  revealed: boolean;
  isComplete: boolean;
  isUpdating: boolean;
  isLoading: boolean;
  wordQueue: StudyWord[];
  progress: number;
  maxProgress: number;
  currentWordKey: string;
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
  /** Per-grade interval labels ("10m"/"4d") for the current card's grade bar. */
  intervalLabels: Partial<Record<WordConfidence, string>>;
  handleClose: () => void;
  transparentStyle: AnimatedStyleProp<ViewStyle>;
  sessionMetrics: SessionMetrics;
  handleReplayAudio: () => Promise<void>;
  /** Play an example sentence's audio (explicit user tap only). */
  playSentenceAudio: (storagePath: string) => Promise<void>;
  /** True while a forgotten card is held on its answer face for a restudy beat
   *  instead of advancing. The bottom slot becomes a "Tap to continue" prompt. */
  restudying: boolean;
  /** Leave the restudy hold and commit the pending "Forgot". */
  continueFromRestudy: () => void;
  isAudioPreloading: boolean;
  audioPreloadProgress: number;
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
  /** Due words beyond the current session chunk ("Review N more" affordance). */
  remainingDueCount: number;
  /** Start the next chunk of a large backlog after a completed session. */
  startNextChunk: () => void;
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
   * Card dissolve on advance. Matched to the swipe's fling-out so a committed
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
   * grade on every path but a swipe, and a watchdog that ignored the hold
   * would fire mid-beat and advance the card out from under its own
   * confirmation.
   */
  fadeWatchdog: VERDICT.BEAT + TIMING_CONFIG.CARD_EXIT.duration + TIMING_CONFIG.MEDIUM.duration,
};

export function useReview({
  fromRemember,
  onClose,
  setPlaybackPriority,
}: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();

  // Open the diagnostics timeline for the lifetime of the screen. Registered
  // before every other effect in this hook so the first card's cache lookups
  // and audio-session setup already fall inside the window; it is closed (and
  // its report printed) by the unmount cleanup at the bottom, which runs last.
  useEffect(() => {
    startDiagSession({ fromRemember: fromRemember ?? false });
  }, []);

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

  // Session metrics tracking hook
  const { metrics: sessionMetrics, updateMetrics, resetMetrics } = useSessionMetrics();

  // UI state
  const [showTranslation, setShowTranslation] = useState(false);
  // Reveal-first: the card starts on its question face; the user flips it to the
  // answer (revealAnswer) BEFORE self-grading. Reset to false on every new card.
  const [revealed, setRevealed] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  // Ensure UI re-renders when updating state changes so gestures re-enable
  const [isUpdatingUI, setIsUpdatingUI] = useState(false);
  // Progress bar high-water mark, surfaced as state so consumers re-render.
  const [maxProgress, setMaxProgress] = useState(0);
  // Holding a forgotten card on its answer face for a restudy beat before it
  // advances. Mirrored in a ref because `grade` is a stable callback that must
  // read the live value to know whether it is the interception or the commit.
  const [restudying, setRestudying] = useState(false);
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
  // for VERDICT.BEAT + CARD_EXIT (320ms; 180ms on a swipe, which skips the
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

  // Active prompt-finish watcher, keyed by the card it belongs to. Held in a
  // ref (not tied to the audio effect's cleanup) so an incidental re-render
  // mid-prompt can't tear it down.
  const promptWatchRef = useRef<{ key: string; cancel: () => void } | null>(null);

  // Read for the silent-prompt row only, so it can say whether the mic was
  // about to open on a word that was never read. Kept in a ref: the prompt
  // effect must not re-run because a setting changed mid-card.
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  // Held in a ref for the same reason as voiceEnabled: the prompt effect must
  // not re-run because the provider re-rendered mid-card. Defaults to a no-op
  // so a caller that does not care (and every test) needs no provider.
  const setPlaybackPriorityRef = useRef(setPlaybackPriority ?? NO_PLAYBACK_PRIORITY);
  useEffect(() => {
    setPlaybackPriorityRef.current = setPlaybackPriority ?? NO_PLAYBACK_PRIORITY;
  }, [setPlaybackPriority]);
  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

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
    progress,
    remainingDueCount,
    updateWord,
    previewIntervals,
    invalidateQueries,
    wordQueue,
    isLoading,
    resetQueue,
    flushPendingWrites,
  } = useFSRS({
    userId: user?.id,
    onComplete: triggerCompletionTransition,
    sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
  });

  // Audio preloading hook (must come after wordQueue/isComplete from useFSRS)
  const {
    isPreloading: isAudioPreloading,
    progress: audioPreloadProgress,
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
    () => (currentWord && previewIntervals ? previewIntervals(currentWord) : {}),
    [currentWord, previewIntervals],
  );

  // Ensure translation is hidden when advancing to a new word.
  // Synchronises local UI flags with currentWordKey transitions; setState here is
  // intentional — the alternative (derived state) loses the timer-clearing side effect.
  useEffect(() => {
    // Clear any pending translation timers
    clearTimer('meaningTimeout');

    // Immediately hide translation and snap the card back to its question face
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTranslation(false);
    setRevealed(false);
    setCurrentMeaning('');
    // A restudy hold belongs to the card that earned it. Clearing both here
    // means an interrupted hold (session close, chunk restart) can never leak
    // into the next card and swallow its first "Forgot".
    restudyRef.current = false;
    setRestudying(false);
    // Reset stale completion flag if a new word/session appears
    if (currentWordKey !== 'none' && stateRefs.current.completionTriggered) {
      stateRefs.current.completionTriggered = false;
    }
  }, [currentWordKey, clearTimer]);

  // Process the word update in FSRS
  const processFeedback = useCallback(
    async (confidence: WordConfidence, controller: AbortController) => {
      if (!currentWord?.root_id || controller.signal.aborted) {
        return;
      }

      // Store old stability + reps before update for metrics / telemetry
      const oldStability = currentWord.fsrs_stability ?? undefined;
      const reps = currentWord.fsrs_reps ?? 0;
      const rootId = currentWord.root_id;

      try {
        // Call updateWord and capture the new stability value
        const newStability = await updateWord(rootId, confidence);

        // Increment words reviewed count for analytics
        wordsReviewedCount.current += 1;

        // Per-grade telemetry — the Forgot/Guessed/Knew-it distribution the
        // reveal-first flow is about (binary swipe analytics couldn't express it).
        analytics.track(ANALYTICS_EVENTS.REVIEW_WORD_GRADED, {
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
          // Session is already complete, trigger completion transition
          triggerCompletionTransition();
          // Word process complete immediately
        } else {
          // Continue with normal flow - fade in immediately (no delay)
          // This ensures audio and visual appearance are synchronized
          fadeIn();
        }
      } catch (error) {
        handleError(error);
        if (!stateRefs.current.isUpdatingWord) return;
        fadeIn();
      } finally {
        stateRefs.current.isUpdatingWord = false;
        setIsUpdatingUI(false);
        clearTimer('meaningTimeout');
      }
    },
    [
      currentWord?.root_id,
      currentWord?.fsrs_stability,
      currentWord?.fsrs_reps,
      updateWord,
      updateMetrics,
      fadeIn,
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

      const preloaded = resolveCached(url);
      // Reported rather than inferred: a play-time cache miss and a cache
      // self-heal both cost seconds, and from the outside they look identical
      // to a player that simply refused to load.
      const detail: PlayAudioDetail = { cacheMissed: preloaded === null, healed: false };
      const report = (started: boolean): boolean => {
        onResolved?.(detail);
        return started;
      };
      const localPath = preloaded ?? (await audioCache.getAudio(url, { quick: true }));

      const makeTrack = (audioUrl: string) => ({
        id: `review-${Date.now()}`,
        audioUrl,
        title: 'Review Audio',
      });

      const seq = ++playAudioSeqRef.current;

      try {
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
        handleError(error);
        return report(false);
      }
    },
    [resolveCached, forgetCached],
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
        // AWAITED, not fired alongside the play: until the input stream is
        // actually closed the answer plays on the quiet .playAndRecord route.
        // Racing the two lost — the answer began while the microphone was still
        // open, which is exactly what it sounded like.
        setPlaybackPriorityRef
          .current(true)
          .catch(handleError)
          .then(() => playAudio(englishAudioUrl))
          .then(started => endMeaningPlay({ started: started ?? false }))
          .catch(err => {
            endMeaningPlay({ started: false, error: true });
            handleError(err);
          });
      }
    }
  }, [currentWord, isComplete, playAudio]);

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
    lightFeedback();
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
        processFeedback(confidence, controller);
      };

      // Registered before the fade starts, so a close landing inside the fade
      // window can still commit this grade (see pendingGradeRef).
      pendingGradeRef.current = advance;

      // Hold the card at full strength for the verdict beat before dissolving
      // it, so the confirmation is legible on its own. The dissolve is
      // Easing.out — fastest off the mark — so a verdict painted at grade time
      // was under 30% opacity within three frames and never read at all.
      //
      // A swipe is exempt. It has already confirmed continuously under the
      // finger and is throwing the card in the direction of the decision; the
      // beat would hang a thrown card in mid-air.
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
      setRestudying(true);
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
        setPlaybackPriorityRef
          .current(true)
          .catch(handleError)
          .then(() => playAudio(replayUrl))
          .catch(handleError);
      }
    },
    [currentWord?.root?.meaning, currentWord?.root?.audio_url, playAudio],
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
      // the card twice (caught by useReview.swipe.test).
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
    restudyRef.current = false;
    setRestudying(false);
    diagMark('restudy.continue');
    lightFeedback();
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
  // Runs ONCE per session — wordQueue.length changes on every swipe, so without
  // the sessionStarted guard, stopAudioSafely() would race with each new word's
  // playback and intermittently silence the audio after a swipe.
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
    analytics.track(ANALYTICS_EVENTS.REVIEW_SESSION_STARTED, {
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
  // runs in the unknown-swipe flow. Since updateWord is async, currentWord
  // doesn't update synchronously — without the lastProcessedWordId check, the
  // OLD word's Arabic audio briefly replays before the new word's audio starts.
  useEffect(() => {
    if (stateRefs.current.completionTriggered || isComplete) {
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
      void setPlaybackPriorityRef.current(false).catch(handleError);
      if (promptWatchRef.current?.key === keyForRun) promptWatchRef.current = null;
      if (movedOn()) return;
      diagMark('prompt.done');
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
    setPlaybackPriorityRef
      .current(true)
      .catch(handleError)
      .then(() =>
        playAudio(audioUrl, detail => {
          playDetail = detail;
        }),
      )
      .then(started => {
        const playMs = Date.now() - playStartedAt;
        endPromptPlay({ started, movedOn: movedOn() });
        recordPromptPlay(keyForRun, { started, playMs, ...playDetail });
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
            voiceEnabled: voiceEnabledRef.current,
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
        });
        handleError(err);
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

  // Safety watchdog: if no current word and not transitioning, force completion.
  // Must guard on !isLoading — without it, a slow initial FSRS query (>300ms)
  // misfires this watchdog while the loading screen is still showing.
  useEffect(() => {
    if (
      !isComplete &&
      !isLoading &&
      !stateRefs.current.completionTriggered &&
      !stateRefs.current.isUpdatingWord &&
      !currentWord
    ) {
      const timer = setTimeout(() => {
        if (
          !isComplete &&
          !stateRefs.current.completionTriggered &&
          !stateRefs.current.isUpdatingWord &&
          !currentWord
        ) {
          triggerCompletionTransition();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentWord, isComplete, isLoading, triggerCompletionTransition]);

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
      setPlaybackPriorityRef
        .current(true)
        .catch(handleError)
        .then(() => playAudio(audioUrl))
        .catch(handleError);
    }
  }, [currentWord, playAudio]);

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
   */
  const commitPendingGrade = useCallback(() => {
    const pendingGrade = pendingGradeRef.current;
    pendingGradeRef.current = null;
    pendingGrade?.();
  }, []);

  const finalizeSession = useCallback(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    commitPendingGrade();

    // The flush must complete even though this closure outlives the screen.
    //
    // Guarded because this is the FIRST step of the unmount cleanup: abort,
    // timer cleanup, telemetry reset and the abandonment event all run after
    // it, and a throw here would take every one of them down with it. A real
    // failure still surfaces rather than being swallowed.
    try {
      void flushPendingWrites().then(invalidateQueries).catch(handleError);
    } catch (error) {
      handleError(error);
    }
  }, [commitPendingGrade, flushPendingWrites, invalidateQueries]);

  // Held in a ref so the unmount cleanup can call it without taking it as a
  // dependency — that effect must stay mount/unmount-only (see its own note).
  const finalizeSessionRef = useRef(finalizeSession);
  useEffect(() => {
    finalizeSessionRef.current = finalizeSession;
  }, [finalizeSession]);

  const handleClose = () => {
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
    // (split work + requestIdleCallback) changes *when* this runs, not just its name.
    // These sit in preload/review hot paths; migrating needs per-site profiling.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- see note above
    InteractionManager.runAfterInteractions(() => {
      finalizeSession();
    });

    // Schedule navigation with timer cleanup
    setTimer(
      'navigation',
      () => {
        if (onClose) {
          onClose();
        } else if (fromRemember) {
          router.replace(ROUTE_PATHS.PRACTICE_TAB);
        } else {
          router.dismiss();
        }
      },
      100,
    );
  };

  // Start the next chunk of a large backlog after a completed session. A fresh
  // chunk is a fresh session: completion/progress/analytics/metrics state is
  // reset so the header and recall signals track this chunk only (resetMetrics
  // prevents double-appending the previous chunk's first-attempt signals into
  // adaptive pacing — useReviewCompletion appends per completion-screen mount).
  const startNextChunk = useCallback(() => {
    stateRefs.current.completionTriggered = false;
    stateRefs.current.progressUpdatedForCompletion = false;
    stateRefs.current.maxProgress = 0;
    setMaxProgress(0);
    setShowTranslation(false);
    setRevealed(false);
    timeRefs.current.lastProcessedWordId = null;
    sessionStarted.current = false;
    sessionStartTime.current = null;
    wordsReviewedCount.current = 0;
    resetMetrics();
    resetQueue();
  }, [resetMetrics, resetQueue]);

  // Unmount-only cleanup: tracks abandonment, aborts in-flight work, resets refs.
  // Deps must NOT include wordQueue.length — useFSRS.updateWord shrinks the queue
  // on every swipe, so a length dep here would re-fire this cleanup mid-session,
  // double-firing analytics, racing stopAudioSafely() against the new word's
  // playAudio() in the audio-play effect, and clobbering session state.
  useEffect(() => {
    return () => {
      // FIRST, before the abort below can cancel it: persist a grade still
      // waiting on the fade and leave the caches consistent. This is the only
      // hook exits that never reach `handleClose` have — Android's back button
      // and back gesture, or a parent navigation. Idempotent, so the ✕ path
      // (which already finalized) falls straight through.
      finalizeSessionRef.current();

      if (
        sessionStarted.current &&
        !stateRefs.current.completionTriggered &&
        sessionStartTime.current
      ) {
        const sessionDurationMs = Date.now() - sessionStartTime.current;
        const wordsRemaining = totalWordsInSessionRef.current - wordsReviewedCount.current;

        analytics.track(ANALYTICS_EVENTS.REVIEW_SESSION_ABANDONED, {
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

      setShowTranslation(false);
      setRevealed(false);

      try {
        fadeIn();
      } catch {
        // Animation cleanup failed - continue
      }

      stopAudioSafely();
      clearAllTimers();

      stateRefs.current.isUpdatingWord = false;
      setIsUpdatingUI(false);
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
  }, [fadeIn, stopAudioSafely, clearAllTimers]);

  return {
    currentSentence,
    currentMeaning,
    currentWord,
    showTranslation,
    revealed,
    isComplete,
    isUpdating: isUpdatingUI,
    isLoading,
    wordQueue,
    progress,
    maxProgress,
    currentWordKey,
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
    audioPreloadProgress,
    isAudioReady,
    revealMeaningPassive,
    stopAudio: stopAudioSafely,
    remainingDueCount,
    startNextChunk,
  };
}
