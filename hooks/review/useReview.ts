import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { InteractionManager } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONFIG } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { simpleAudioService, type AudioStatus } from '@/services/audioPlayer';
import { useOpacityAnimation } from '@/hooks/animations';
import { useSimpleAudioPlayer } from '@/hooks/audio';
import { useAuth } from '@/hooks/auth';
import { useAudioPreloader } from './useAudioPreloader';
import { useSessionMetrics } from './useSessionMetrics';
import { useTimerCleanup } from '@/hooks/utils';
import { useFSRS } from '@/hooks/vocabulary';
import { audioCache } from '@/services/audioCache';
import type {
  ReviewStateRefs,
  ReviewTimeRefs,
  SessionMetrics,
  WordConfidence,
} from '@/types/review.types';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';
import { generateStorageUrl } from '@/utils/storageUtils';

interface UseReviewProps {
  fromRemember?: boolean;
  onClose?: () => void;
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
   */
  grade: (confidence: WordConfidence, opts?: { fromVoice?: boolean }) => void;
  /** Per-grade interval labels ("10m"/"4d") for the current card's grade bar. */
  intervalLabels: Partial<Record<WordConfidence, string>>;
  handleClose: () => void;
  transparentStyle: AnimatedStyleProp<ViewStyle>;
  sessionMetrics: SessionMetrics;
  handleReplayAudio: () => Promise<void>;
  isAudioPreloading: boolean;
  audioPreloadProgress: number;
  /** The first card's audio is cached — the session may run. Later cards keep
   *  preloading in the background (see useAudioPreloader). */
  isAudioReady: boolean;
  /** Play the English meaning audio without advancing or flipping the card.
   *  Shared by the manual reveal and the voice-grading miss path (the answer is
   *  shown by the flip / the voice result panel; this just plays the audio). */
  revealMeaningPassive: () => void;
  /** The `currentWordKey` whose Arabic prompt audio has finished playing (or
   *  had no audio to play). Lets the voice-grading hook arm the mic only once
   *  the prompt is fully done, without sniffing the global audio status — which
   *  can't tell this card's prompt from lingering/previous audio. */
  promptAudioDoneKey: string | null;
  /** Stop any in-flight playback (e.g. the reveal audio) so the mic can reopen
   *  cleanly on a voice retry without capturing the tail of a spoken answer. */
  stopAudio: () => void;
  /** Due words beyond the current session chunk ("Review N more" affordance). */
  remainingDueCount: number;
  /** Start the next chunk of a large backlog after a completed session. */
  startNextChunk: () => void;
}

// Timing constants for transitions (milliseconds)
const TRANSITION_DELAYS = {
  initial: TIMING_CONFIG.FAST.duration, // Initial delay before animation
  fadeAnimation: TIMING_CONFIG.MEDIUM.duration, // Delay for fade animation
};

/** Grace after the prompt stops before declaring it done, so the tail isn't
 *  clipped and the playback session fully releases before the mic opens. */
const PROMPT_FINISH_GRACE_MS = 200;
/** Safety cap: declare the prompt done regardless if the finish event never
 *  arrives (e.g. a status stream that stalls), so the mic never hangs. */
const PROMPT_MAX_WAIT_MS = 8000;

/**
 * Resolves (via `onFinish`) once the prompt audio just started by `play()` has
 * finished. Anchored to a play() that already resolved, so the current player
 * IS this card's prompt — no "whose audio is this" ambiguity. `subscribe` only
 * fires on change and doesn't replay the current status, so a light poll backs
 * the finish detection and the safety cap. Returns a canceller.
 */
function watchPromptFinish(onFinish: () => void, isCancelled: () => boolean): () => void {
  let settled = false;
  const startedAt = Date.now();
  // play() flips status.playing true before resolving, so we usually see the
  // rising edge on the immediate evaluate below.
  let sawPlaying = false;

  const finish = (graceMs: number): void => {
    if (settled) return;
    settled = true;
    clearInterval(poll);
    unsubscribe();
    if (graceMs > 0 && !isCancelled()) setTimeout(onFinish, graceMs);
    else onFinish();
  };

  const evaluate = (status: AudioStatus): void => {
    if (isCancelled()) return finish(0);
    if (status.playing) sawPlaying = true;
    if (sawPlaying && !status.playing) return finish(PROMPT_FINISH_GRACE_MS);
    if (Date.now() - startedAt >= PROMPT_MAX_WAIT_MS) return finish(0);
  };

  const unsubscribe = simpleAudioService.subscribe(evaluate);
  const poll = setInterval(() => evaluate(simpleAudioService.getStatus()), 100);
  evaluate(simpleAudioService.getStatus());
  return () => finish(0);
}

export function useReview({ fromRemember, onClose }: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();

  // Use enhanced audio player instead of local expo-av implementation
  const audioPlayer = useSimpleAudioPlayer();

  // Create stable refs for audio player methods to avoid dependency issues
  const audioPlayerRef = useRef(audioPlayer);
  useEffect(() => {
    audioPlayerRef.current = audioPlayer;
  });

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
  // The currentWordKey whose Arabic prompt has finished (or had no audio).
  // Drives the voice-grading mic arm; never reset on its own — a stale value
  // from a prior card can't match the new currentWordKey (which encodes reps).
  const [promptAudioDoneKey, setPromptAudioDoneKey] = useState<string | null>(null);

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

  // Active prompt-finish watcher, keyed by the card it belongs to. Held in a
  // ref (not tied to the audio effect's cleanup) so an incidental re-render
  // mid-prompt can't tear it down and strand `promptAudioDoneKey`.
  const promptWatchRef = useRef<{ key: string; cancel: () => void } | null>(null);

  // Monotonic token for playAudio calls. play() returning false can mean the
  // call was superseded by a newer play (or a stop); the cache self-heal retry
  // must only run for the LATEST call, or a stale retry would invalidate a
  // healthy file and hijack the newer playback it lost to.
  const playAudioSeqRef = useRef(0);

  // Utility to stop audio safely
  const stopAudioSafely = useCallback(() => {
    // A user-initiated stop also outdates any pending self-heal retry.
    playAudioSeqRef.current++;
    audioPlayerRef.current.stop().catch(() => {
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
  // The session preloader has already cached every word's audio, so this is a
  // local read in the normal case. Quick mode keeps the rare cache miss from
  // hanging the card on the patient multi-retry download sequence.
  const playAudio = useCallback(async (url: string) => {
    if (!url) return false;

    const localPath = await audioCache.getAudio(url, { quick: true });

    const makeTrack = (audioUrl: string) => ({
      id: `review-${Date.now()}`,
      audioUrl,
      title: 'Review Audio',
    });

    const seq = ++playAudioSeqRef.current;

    try {
      const success = await audioPlayerRef.current.play(makeTrack(localPath));
      if (success) return true;

      // false can also mean this play was superseded by a newer play/stop —
      // in that case the file is fine and retrying would hijack the newer
      // playback. Only the latest call may self-heal.
      if (playAudioSeqRef.current !== seq) return false;

      // A cached copy that fails to load is almost always a corrupt/partial
      // download poisoning the cache — without purging it, this word would
      // stay silent in every future session. Re-fetch once and retry.
      if (localPath !== url) {
        await audioCache.invalidate(url);
        const freshPath = await audioCache.getAudio(url, { quick: true });
        if (playAudioSeqRef.current !== seq) return false;
        return await audioPlayerRef.current.play(makeTrack(freshPath));
      }
      return false;
    } catch (error) {
      handleError(error);
      return false;
    }
  }, []);

  // Play the English meaning audio without advancing or flipping the card.
  // Shared by the manual reveal (revealAnswer) and the voice-grading miss path
  // (onRevealAnswer) — the answer text is shown by the flip / the VoiceResultPanel,
  // so this only handles audio.
  const revealMeaningPassive = useCallback(() => {
    if (stateRefs.current.isUpdatingWord || isComplete || stateRefs.current.completionTriggered) {
      return;
    }
    if (currentWord?.root?.audio_url_en) {
      const englishAudioUrl = generateStorageUrl('audio', currentWord.root.audio_url_en);
      if (englishAudioUrl) {
        playAudio(englishAudioUrl).catch(handleError);
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
  const grade = useCallback(
    (confidence: WordConfidence, opts: { fromVoice?: boolean } = {}) => {
      if (stateRefs.current.isUpdatingWord || isComplete || stateRefs.current.completionTriggered) {
        return;
      }
      // Grading only happens after the answer is revealed — except a voice match,
      // which confirms the answer without an on-screen reveal.
      if (!revealed && !opts.fromVoice) return;

      stateRefs.current.isUpdatingWord = true;
      setIsUpdatingUI(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Note: session metrics are updated in processFeedback after FSRS calculation
      // (it has both old and new stability for accurate tracking).
      setTimer(
        'initialTransition',
        () => {
          if (controller.signal.aborted) return;

          // Stop the reveal (English) audio before advancing so it doesn't bleed
          // into the next card.
          stopAudioSafely();
          fadeOut();
          setTimer(
            'fadeAnimation',
            () => {
              if (controller.signal.aborted) return;
              processFeedback(confidence, controller);
            },
            TRANSITION_DELAYS.fadeAnimation,
          );
        },
        TRANSITION_DELAYS.initial,
      );
    },
    [revealed, isComplete, fadeOut, processFeedback, setTimer, stopAudioSafely],
  );

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
        // UI progress updated
      }

      // Only update if not already at 100% to prevent cycles
      if (isComplete && stateRefs.current.maxProgress < 100) {
        stateRefs.current.maxProgress = 100;
        setMaxProgress(100);
        // Use a ref to track if we've already updated this cycle
        if (!stateRefs.current.progressUpdatedForCompletion) {
          stateRefs.current.progressUpdatedForCompletion = true;
        }
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
    if (!wordQueue || wordQueue.length === 0 || isComplete) return;

    // Stop any existing audio from other sessions (like listen tab)
    stopAudioSafely();

    // Pre-configure audio session in background to reduce first audio delay
    audioPlayerRef.current.preconfigureAudioSession?.().catch(() => {
      // Ignore pre-configuration errors - session will be configured on first play
    });

    sessionStarted.current = true;
    sessionStartTime.current = Date.now();
    totalWordsInSessionRef.current = wordQueue.length;
    analytics.track(ANALYTICS_EVENTS.REVIEW_SESSION_STARTED, {
      word_count: wordQueue.length,
      source: 'practice_tab',
    });
  }, [wordQueue?.length, isComplete, stopAudioSafely]);

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
      return;
    }

    // Gated on the FIRST card's audio only. Later cards' files are still
    // downloading in the background; playAudio's quick mode (below) covers the
    // rare case where the user reaches a card before its file has landed.
    if (isAudioPreloading || !isAudioReady) {
      return;
    }

    // currentWordKey changes on each FSRS update (includes fsrs_last_review +
    // fsrs_reps), so a word reappearing later in the session still re-plays.
    if (timeRefs.current.lastProcessedWordId === currentWordKey) {
      return;
    }
    timeRefs.current.lastProcessedWordId = currentWordKey;

    const keyForRun = currentWordKey;

    // Cancel a still-running watcher from a previous card before this one's.
    if (promptWatchRef.current && promptWatchRef.current.key !== keyForRun) {
      promptWatchRef.current.cancel();
      promptWatchRef.current = null;
    }

    // The card advanced if lastProcessedWordId no longer points at this run.
    const movedOn = (): boolean => timeRefs.current.lastProcessedWordId !== keyForRun;
    const markDone = (): void => {
      if (promptWatchRef.current?.key === keyForRun) promptWatchRef.current = null;
      // A stale watcher (card already advanced) would set an old key, which the
      // voice gate harmlessly ignores — but skip the needless re-render.
      if (!movedOn()) setPromptAudioDoneKey(keyForRun);
    };

    const audioUrl = generateStorageUrl('audio', currentWord.root.audio_url);
    if (!audioUrl) {
      // No prompt to play — let the mic arm immediately for this card. Deferred
      // off the effect body so it isn't a synchronous cascading setState.
      void Promise.resolve().then(markDone);
      return;
    }

    playAudio(audioUrl)
      .then(started => {
        if (movedOn()) return;
        // Playback didn't start (cache miss / play failure) — don't strand the
        // voice mic waiting; let it arm now.
        if (!started) {
          markDone();
          return;
        }
        promptWatchRef.current = { key: keyForRun, cancel: watchPromptFinish(markDone, movedOn) };
      })
      .catch(err => {
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
      playAudio(audioUrl).catch(handleError);
    }
  }, [currentWord, playAudio]);

  const handleClose = () => {
    const mounted = { current: true };

    lightFeedback();

    // Stop any playing audio when closing
    stopAudioSafely();

    if (!mounted.current) return;

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
    // with pre-grade data. Not gated on `mounted` — the flush must complete even
    // though this closure outlives the screen.
    InteractionManager.runAfterInteractions(() => {
      void flushPendingWrites().then(invalidateQueries);
    });

    // Schedule navigation with timer cleanup
    setTimer(
      'navigation',
      () => {
        if (mounted.current) {
          if (onClose) {
            onClose();
          } else if (fromRemember) {
            router.replace(ROUTE_PATHS.PRACTICE_TAB);
          } else {
            router.dismiss();
          }
        }
        mounted.current = false;
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
    isAudioPreloading,
    audioPreloadProgress,
    isAudioReady,
    revealMeaningPassive,
    promptAudioDoneKey,
    stopAudio: stopAudioSafely,
    remainingDueCount,
    startNextChunk,
  };
}
