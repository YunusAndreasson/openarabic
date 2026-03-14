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
}


// Timing constants for transitions (milliseconds)
const TRANSITION_DELAYS = {
  initial: TIMING_CONFIG.FAST.duration, // Initial delay before animation
  fadeAnimation: TIMING_CONFIG.MEDIUM.duration, // Delay for fade animation
  meaningDisplay: 3000, // Display time for meaning overlay
};

export function useReview({ fromRemember, onClose }: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use enhanced audio player instead of local expo-av implementation
  const audioPlayer = useSimpleAudioPlayer();

  // Create stable refs for audio player methods to avoid dependency issues
  const audioPlayerRef = useRef(audioPlayer);
  audioPlayerRef.current = audioPlayer;

  // Use optimized opacity animation from hooks/animations
  // animatedStyle uses Reanimated 4 inline shared values (no useAnimatedStyle wrapper)
  const { animatedStyle: opacityStyle, fadeIn, fadeOut } = useOpacityAnimation({
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

  // Consolidated time tracking refs
  const timeRefs = useRef<ReviewTimeRefs>({
    lastProgressUpdate: Date.now(),
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

  // Add controller ref for proper cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Ensure translation is hidden when advancing to a new word
  useEffect(() => {
    // Clear any pending translation timers
    clearTimer('meaningTimeout');

    // Immediately hide translation and reset state
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

  const handleKnowledgeResponse = useCallback(
    (confidence: 'known' | 'unknown') => {
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

          // KNOWN WORDS: Fade out and proceed quickly
          if (confidence === 'known') {
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
        timeRefs.current.lastProgressUpdate = now;
        // UI progress updated
      }

      // Only update if not already at 100% to prevent cycles
      if (isComplete && stateRefs.current.maxProgress < 100) {
        stateRefs.current.maxProgress = 100;
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
      stateRefs.current.progressUpdatedForCompletion = true;
    }

    // Reset the flag when completion state changes
    if (!isComplete) {
      stateRefs.current.progressUpdatedForCompletion = false;
    }
  }, [isComplete]);

  // Effect: Initialize audio session when practice starts and track session start
  useEffect(() => {
    if (wordQueue && wordQueue.length > 0 && !isComplete) {
      // Stop any existing audio from other sessions (like listen tab)
      stopAudioSafely();

      // Pre-configure audio session in background to reduce first audio delay
      audioPlayerRef.current.preconfigureAudioSession?.().catch(() => {
        // Ignore pre-configuration errors - session will be configured on first play
      });

      // Track review session started (only once per session)
      if (!sessionStarted.current) {
        sessionStarted.current = true;
        sessionStartTime.current = Date.now();
        analytics.track(ANALYTICS_EVENTS.REVIEW_SESSION_STARTED, {
          word_count: wordQueue.length,
          source: 'practice_tab',
        });
      }
    }
  }, [wordQueue?.length, isComplete, stopAudioSafely]);

  // Effect: Handle current word changes and play audio (simplified - no more loading)
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

    // CRITICAL FIX: Only play audio after preloading is complete
    if (isAudioPreloading || !isAudioPreloadingComplete) {
      return;
    }

    const wordId = String(currentWord.root_id);
    // generateStorageUrl is a pure utility function - no need in dependency array
    const audioUrl = generateStorageUrl('audio', currentWord.root.audio_url);

    // Play audio for Arabic words (preloaded, so should be instant)
    if (audioUrl) {
      playAudio(audioUrl).catch(handleError);
    }

    // Update the lastProcessedWordId
    timeRefs.current.lastProcessedWordId = wordId;
  }, [
    currentWord,
    isComplete,
    showTranslation,
    playAudio,
    isAudioPreloading,
    isAudioPreloadingComplete,
  ]);

  // Safety watchdog: if no current word and not transitioning, force completion
  useEffect(() => {
    if (
      !isComplete &&
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
          // UI watchdog completion warning
          triggerCompletionTransition();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentWord, isComplete, triggerCompletionTransition]);

  const handleSwipeLeft = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWordRef.current) return;
    handleKnowledgeResponse('unknown');
  }, [handleKnowledgeResponse, isComplete]);

  const handleSwipeRight = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWordRef.current) return;
    handleKnowledgeResponse('known');
  }, [handleKnowledgeResponse, isComplete]);

  // Replay audio for current word (passed to WordDisplay via ReviewCard)
  // This callback is provided to ReviewContent via context and used in WordDisplay
  const handleReplayAudio = useCallback(async () => {
    if (!currentWord?.root?.audio_url) return;

    // Stop any currently playing audio first to avoid race conditions
    try {
      await audioPlayerRef.current.stop();
    } catch {
      // Ignore stop errors - audio might not be playing
    }

    const audioUrl = generateStorageUrl('audio', currentWord.root.audio_url);
    if (audioUrl) {
      playAudio(audioUrl).catch(handleError);
    }
  }, [currentWord, playAudio]);

  const handleClose = useCallback(() => {
    const mounted = { current: true };

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
            router.back();
          }
        }
        mounted.current = false;
      },
      100,
    );
  }, [invalidateQueries, user?.id, queryClient, onClose, fromRemember, setTimer, stopAudioSafely]);

  // Cleanup effect
  useEffect(() => {
    // Capture current values for cleanup closure
    const wasSessionStarted = sessionStarted.current;
    const sessionStart = sessionStartTime.current;
    const totalWordsInQueue = wordQueue?.length ?? 0;

    return () => {
      // Track abandoned session if user leaves without completing
      // Only track if session was started and not completed
      if (wasSessionStarted && !stateRefs.current.completionTriggered && sessionStart) {
        const sessionDurationMs = Date.now() - sessionStart;
        const wordsRemaining = totalWordsInQueue - wordsReviewedCount.current;

        analytics.track(ANALYTICS_EVENTS.REVIEW_SESSION_ABANDONED, {
          words_reviewed: wordsReviewedCount.current,
          words_remaining: Math.max(0, wordsRemaining),
          session_duration_ms: sessionDurationMs,
        });
      }

      // Abort any ongoing knowledge response operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      stateRefs.current.completionTriggered = true;
      stateRefs.current.progressUpdatedForCompletion = false;

      // Explicitly reset UI state on unmount
      setShowTranslation(false);

      // Safely call fadeIn with error handling to prevent crashes
      try {
        fadeIn();
      } catch {
        // Animation cleanup failed - continue
      }

      // Ensure audio is stopped and cleaned up
      stopAudioSafely();

      // Clean up all timers
      clearAllTimers();

      // Reset all state refs to prevent stale references
      stateRefs.current.isUpdatingWord = false;
      setIsUpdatingUI(false);
      stateRefs.current.maxProgress = 0;
      timeRefs.current.lastProcessedWordId = null;
      timeRefs.current.lastProgressUpdate = Date.now();

      // Reset session tracking refs
      sessionStarted.current = false;
      sessionStartTime.current = null;
      wordsReviewedCount.current = 0;
    };
  }, [fadeIn, stopAudioSafely, clearAllTimers, wordQueue?.length]);

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
    maxProgress: stateRefs.current.maxProgress,
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
  };
}
