import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { InteractionManager } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONFIG } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
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
import type { ReviewStateRefs, ReviewTimeRefs, SessionMetrics } from '@/types/review.types';
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
  isComplete: boolean;
  isUpdating: boolean;
  isLoading: boolean;
  wordQueue: StudyWord[];
  progress: number;
  maxProgress: number;
  currentWordKey: string;
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handleClose: () => void;
  transparentStyle: AnimatedStyleProp<ViewStyle>;
  sessionMetrics: SessionMetrics;
  handleReplayAudio: () => Promise<void>;
  isAudioPreloading: boolean;
  audioPreloadProgress: number;
  isAudioPreloadingComplete: boolean;
  /** Show the English meaning + play English audio without advancing the card.
   *  Used by the voice-grading flow on a missed transcript: the user gets the
   *  answer as a study aid but still chooses Known / Unknown manually. */
  revealMeaningPassive: () => void;
  /** The `currentWordKey` whose Arabic prompt audio has finished playing (or
   *  had no audio to play). Lets the voice-grading hook arm the mic only once
   *  the prompt is fully done, without sniffing the global audio status — which
   *  can't tell this card's prompt from lingering/previous audio. */
  promptAudioDoneKey: string | null;
  /** Advance the current card as Unknown WITHOUT re-revealing the meaning —
   *  used by the voice result panel, which already revealed the answer. Skips
   *  the meaning overlay, the English audio replay and the 3 s display wait. */
  handleVoiceUnknownResolved: () => void;
  /** Stop any in-flight playback (e.g. the reveal audio) so the mic can reopen
   *  cleanly on a voice retry without capturing the tail of a spoken answer. */
  stopAudio: () => void;
}

// Timing constants for transitions (milliseconds)
const TRANSITION_DELAYS = {
  initial: TIMING_CONFIG.FAST.duration, // Initial delay before animation
  fadeAnimation: TIMING_CONFIG.MEDIUM.duration, // Delay for fade animation
  meaningDisplay: 3000, // Display time for meaning overlay
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
  const queryClient = useQueryClient();

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
  const { metrics: sessionMetrics, updateMetrics } = useSessionMetrics();

  // UI state
  const [showTranslation, setShowTranslation] = useState(false);
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

  // Utility to stop audio safely
  const stopAudioSafely = useCallback(() => {
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

  const { currentWord, isComplete, progress, updateWord, invalidateQueries, wordQueue, isLoading } =
    useFSRS({
      userId: user?.id,
      onComplete: triggerCompletionTransition,
      sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
    });

  // Audio preloading hook (must come after wordQueue/isComplete from useFSRS)
  const {
    isPreloading: isAudioPreloading,
    progress: audioPreloadProgress,
    isComplete: isAudioPreloadingComplete,
  } = useAudioPreloader(wordQueue, isComplete);

  // Derive currentSentence directly from currentWord (React 19 auto-memoizes)
  const currentSentence = { wordForm: currentWord?.root?.letters ?? '' };

  // Unique key for the current word to trigger renders (React 19 auto-memoizes)
  const currentWordKey = currentWord
    ? `${currentWord.root_id}-${currentWord.fsrs_last_review ?? ''}-${currentWord.fsrs_reps ?? 0}`
    : 'none';

  // Stable refs for callback optimization
  const currentWordRef = useRef(currentWord);
  const currentWordKeyRef = useRef(currentWordKey);

  // Update refs when values change
  useEffect(() => {
    currentWordRef.current = currentWord;
    currentWordKeyRef.current = currentWordKey;
  }, [currentWord, currentWordKey]);

  // Ensure translation is hidden when advancing to a new word.
  // Synchronises local UI flags with currentWordKey transitions; setState here is
  // intentional — the alternative (derived state) loses the timer-clearing side effect.
  useEffect(() => {
    // Clear any pending translation timers
    clearTimer('meaningTimeout');

    // Immediately hide translation and reset state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTranslation(false);
    setCurrentMeaning('');
    // Reset stale completion flag if a new word/session appears
    if (currentWordKey !== 'none' && stateRefs.current.completionTriggered) {
      stateRefs.current.completionTriggered = false;
    }
  }, [currentWordKey, clearTimer]);

  // Batch state updates for translation display
  const showTranslationWithTimeout = useCallback(
    (meaning: string) => {
      setCurrentMeaning(meaning);
      setShowTranslation(true);

      setTimer(
        'meaningDisplay',
        () => {
          setShowTranslation(false);
        },
        TRANSITION_DELAYS.meaningDisplay,
      );
    },
    [setTimer],
  );

  // Shows translation for unknown words
  const displayMeaning = useCallback(() => {
    const meaning = currentWord?.root?.meaning || 'No translation available';
    showTranslationWithTimeout(meaning);
  }, [currentWord?.root?.meaning, showTranslationWithTimeout]);

  // Process the word update in FSRS
  const processFeedback = useCallback(
    async (confidence: 'known' | 'unknown', controller: AbortController) => {
      if (!currentWord?.root_id || controller.signal.aborted) {
        return;
      }

      // Store old stability before update for metrics tracking
      const oldStability = currentWord.fsrs_stability ?? undefined;
      const rootId = currentWord.root_id;

      try {
        // Call updateWord and capture the new stability value
        const newStability = await updateWord(rootId, confidence);

        // Increment words reviewed count for analytics
        wordsReviewedCount.current += 1;

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
        handleError(error instanceof Error ? error : new Error(String(error)));
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
      updateWord,
      updateMetrics,
      fadeIn,
      isComplete,
      triggerCompletionTransition,
      clearTimer,
    ],
  );

  // Enhanced audio playback function for single audio files
  const playAudio = useCallback(async (url: string) => {
    if (!url) return Promise.resolve();

    // CRITICAL FIX: Get cached local path instead of using remote URL
    // Eliminates ~1000ms network latency by using preloaded local files
    const localPath = await audioCache.getAudio(url);

    const track = {
      id: `review-${Date.now()}`,
      audioUrl: localPath,
      title: 'Review Audio',
    };

    try {
      // Play audio immediately from local cache (preloaded)
      const success = await audioPlayerRef.current.play(track);
      return success;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, []);

  // Voice-grading miss path: reveal the meaning + play the English audio, but
  // do NOT schedule processFeedback. The card stays open for the user to pick.
  const revealMeaningPassive = useCallback(() => {
    if (stateRefs.current.isUpdatingWord || isComplete || stateRefs.current.completionTriggered) {
      return;
    }
    displayMeaning();
    if (currentWord?.root?.audio_url_en) {
      const englishAudioUrl = generateStorageUrl('audio', currentWord.root.audio_url_en);
      if (englishAudioUrl) {
        playAudio(englishAudioUrl).catch(handleError);
      }
    }
  }, [currentWord, displayMeaning, isComplete, playAudio]);

  const handleKnowledgeResponse = useCallback(
    (confidence: 'known' | 'unknown', options: { skipReveal?: boolean } = {}) => {
      // skipReveal: the answer was already revealed (voice result panel), so
      // advance straight through like a Known swipe — no meaning overlay, no
      // English audio replay, no 3 s wait — while still recording Unknown.
      const skipReveal = options.skipReveal ?? false;
      // Guard conditions: exit early if we're already in a processing state
      if (stateRefs.current.isUpdatingWord || isComplete || stateRefs.current.completionTriggered) {
        return;
      }

      // Set updating flag immediately to prevent concurrent processing
      stateRefs.current.isUpdatingWord = true;
      setIsUpdatingUI(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Note: Session metrics are updated in processFeedback after FSRS calculation
      // This ensures we have both old and new stability values for accurate tracking

      // Start transition animation
      setTimer(
        'initialTransition',
        () => {
          if (controller.signal.aborted) return;

          // Clean up any playing audio before proceeding
          stopAudioSafely();

          // KNOWN WORDS (or an already-revealed voice Unknown): fade out and
          // proceed quickly without re-showing the meaning.
          if (confidence === 'known' || skipReveal) {
            fadeOut();
            setTimer(
              'fadeAnimation',
              () => {
                if (controller.signal.aborted) return;
                processFeedback(confidence, controller);
              },
              TRANSITION_DELAYS.fadeAnimation,
            );
            return;
          }

          // UNKNOWN WORDS: Show translation + play audio + delay before next word
          setTimer(
            'fadeAnimationUnknown',
            () => {
              if (controller.signal.aborted) return;

              // Show translation overlay with red text
              displayMeaning();

              // Play English feedback audio
              if (currentWord?.root?.audio_url_en) {
                const englishAudioUrl = generateStorageUrl('audio', currentWord.root.audio_url_en);
                if (englishAudioUrl) {
                  playAudio(englishAudioUrl);
                }
              }

              // Wait for meaning display before processing
              setTimer(
                'meaningTimeout',
                () => {
                  processFeedback(confidence, controller);
                },
                TRANSITION_DELAYS.meaningDisplay,
              );
            },
            TRANSITION_DELAYS.fadeAnimation,
          );
        },
        TRANSITION_DELAYS.initial,
      );
    },
    [
      isComplete,
      fadeOut,
      displayMeaning,
      processFeedback,
      playAudio,
      currentWord,
      setTimer,
      stopAudioSafely,
    ],
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

    if (isAudioPreloading || !isAudioPreloadingComplete) {
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
        handleError(err instanceof Error ? err : new Error(String(err)));
        markDone();
      });
  }, [
    currentWord,
    currentWordKey,
    isComplete,
    showTranslation,
    playAudio,
    isAudioPreloading,
    isAudioPreloadingComplete,
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

  const handleSwipeLeft = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWordRef.current) return;
    handleKnowledgeResponse('unknown');
  }, [handleKnowledgeResponse, isComplete]);

  const handleSwipeRight = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWordRef.current) return;
    handleKnowledgeResponse('known');
  }, [handleKnowledgeResponse, isComplete]);

  // Voice result panel "Didn't know": the meaning was already revealed when the
  // panel appeared, so advance as Unknown without re-revealing / re-playing.
  const handleVoiceUnknownResolved = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWordRef.current) return;
    handleKnowledgeResponse('unknown', { skipReveal: true });
  }, [handleKnowledgeResponse, isComplete]);

  // Replay audio for current word (passed to WordDisplay via ReviewCard).
  // playAudio → service.play() already pauses + replace()s the existing player
  // and restarts from 0, so an explicit stop() here would just destroy and
  // recreate the native player on every tap.
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

    // Defer query invalidation until after navigation animation completes
    InteractionManager.runAfterInteractions(() => {
      if (!mounted.current) return;

      invalidateQueries();

      if (user?.id) {
        // Invalidate and refetch commonly used FSRS queries
        // Note: Don't invalidate/refetch allWithCooldown - it's session-specific
        // and will be fetched fresh when needed by components that use it
        queryClient.invalidateQueries({ queryKey: fsrsQueries.all(user.id).queryKey });
        queryClient.invalidateQueries({ queryKey: fsrsQueries.due(user.id).queryKey });

        // Eagerly refetch to update counts immediately
        queryClient.refetchQueries({ queryKey: fsrsQueries.all(user.id).queryKey });
        queryClient.refetchQueries({ queryKey: fsrsQueries.due(user.id).queryKey });
      }
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
    isComplete,
    isUpdating: isUpdatingUI,
    isLoading,
    wordQueue,
    progress,
    maxProgress,
    currentWordKey,
    handleSwipeLeft,
    handleSwipeRight,
    handleClose,
    transparentStyle: opacityStyle,
    sessionMetrics,
    handleReplayAudio,
    isAudioPreloading,
    audioPreloadProgress,
    isAudioPreloadingComplete,
    revealMeaningPassive,
    promptAudioDoneKey,
    handleVoiceUnknownResolved,
    stopAudio: stopAudioSafely,
  };
}
