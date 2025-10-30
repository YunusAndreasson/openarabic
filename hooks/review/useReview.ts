import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { InteractionManager } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useOpacityAnimation } from '@/hooks/animations';
import { useSimpleAudioPlayer } from '@/hooks/audio';
import { useAuth } from '@/hooks/auth';
import { useAudioPreloader } from './useAudioPreloader';
import { useSessionMetrics } from './useSessionMetrics';
import { useTimerCleanup } from '@/hooks/utils';
import { useFSRS, useWordSizing } from '@/hooks/vocabulary';
import { audioCache } from '@/services/audioCache';
import type { SessionMetrics } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { generateAudioUrl } from '@/utils/imageUtils';

// Consolidated refs for easier state management
interface ReviewTimeRefs {
  lastVagueTime: number | null;
  lastProgressUpdate: number;
  lastProcessedWordId: string | null;
}

interface ReviewStateRefs {
  maxProgress: number;
  completionTriggered: boolean;
  isUpdatingWord: boolean;
  progressUpdatedForCompletion: boolean;
}

interface UseReviewProps {
  fromRemember?: boolean;
  onClose?: () => void;
}

interface UseReviewReturn {
  currentSentence: { wordForm: string };
  currentMeaning: string;
  currentWord?: StudyWord | null;
  showTranslation: boolean;
  isVagueMeaning: boolean;
  isComplete: boolean;
  isUpdating: boolean;
  isLoading: boolean;
  wordQueue: StudyWord[];
  progress: number;
  maxProgress: number;
  wordFontSize: number;
  currentWordKey: string;
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handleLongPress: () => void;
  handleClose: () => void;
  transparentStyle: ViewStyle;
  sessionMetrics: SessionMetrics;
  isHesitating: SharedValue<boolean>;
  handleHesitationStart: () => void;
  handleHesitationEnd: () => void;
  isAudioPreloading: boolean;
  audioPreloadProgress: number;
  isAudioPreloadingComplete: boolean;
}

interface WordSizingConfig {
  minFontSize: number;
  maxFontSize: number;
  minScreenWidth: number;
  maxScreenWidth: number;
}

const fontConfig: WordSizingConfig = {
  minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6,
  maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3,
  minScreenWidth: 320,
  maxScreenWidth: 500,
};

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
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 1,
    duration: TRANSITION_DELAYS.fadeAnimation,
  });

  // Create animated style from opacity SharedValue for smooth fade transitions
  const opacityStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.get(),
    };
  }, [opacity]);

  // Timer cleanup hook for managing all setTimeout calls
  const { setTimer, clearTimer, clearAllTimers } = useTimerCleanup();

  // Session metrics tracking hook
  const { metrics: sessionMetrics, updateMetrics } = useSessionMetrics();

  // UI state
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [isVagueMeaning, setIsVagueMeaning] = useState(false);
  // Ensure UI re-renders when updating state changes so gestures re-enable
  const [isUpdatingUI, setIsUpdatingUI] = useState(false);
  // Hesitation state as SharedValue for UI thread performance
  const isHesitating = useSharedValue(false);

  // Consolidated time tracking refs
  const timeRefs = useRef<ReviewTimeRefs>({
    lastVagueTime: null,
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

  // Add controller ref for proper cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Utility to stop audio safely
  const stopAudioSafely = useCallback(() => {
    audioPlayerRef.current.stop().catch(() => {});
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

  const wordFontSize = useWordSizing(currentWord?.root?.letters, fontConfig);

  // Derive currentSentence directly from currentWord (React 19 auto-memoizes)
  const currentSentence = { wordForm: currentWord?.root?.letters ?? '' };

  // Unique key for the current word to trigger renders (React 19 auto-memoizes)
  const currentWordKey = currentWord
    ? `${currentWord.root_id}-${currentWord.fsrs_last_review ?? ''}-${currentWord.fsrs_reps ?? 0}`
    : 'none';

  // Track which word hesitation applies to
  const hesitationWordKeyRef = useRef<string>('');

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

    // Immediately hide translation and reset related flags
    setShowTranslation(false);
    setCurrentMeaning('');
    // Reset stale completion flag if a new word/session appears
    if (currentWordKey !== 'none' && stateRefs.current.completionTriggered) {
      stateRefs.current.completionTriggered = false;
    }
  }, [currentWordKey, clearTimer]);

  // Batch state updates for translation display
  const showTranslationWithTimeout = useCallback(
    (meaning: string, isVague: boolean) => {
      setCurrentMeaning(meaning);
      setIsVagueMeaning(isVague);
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

  // Shows translation if needed
  const displayMeaning = useCallback(
    (confidence: 'known' | 'vague' | 'unknown') => {
      if (confidence === 'known') return;

      const meaning = currentWord?.root?.meaning || 'No translation available';
      showTranslationWithTimeout(meaning, confidence === 'vague');
    },
    [currentWord?.root?.meaning, showTranslationWithTimeout],
  );

  // Process the word update in FSRS
  const processFeedback = useCallback(
    async (confidence: 'known' | 'vague' | 'unknown', controller: AbortController) => {
      if (!currentWord?.root_id || controller.signal.aborted) {
        return;
      }

      // CRITICAL FIX: Reset hesitation immediately before processing feedback
      // This prevents hint from showing on the next word during transition
      // Must happen BEFORE updateWord changes currentWord to prevent timing issues
      isHesitating.value = false;
      hesitationWordKeyRef.current = '';

      try {
        await updateWord(currentWord.root_id, confidence);

        if (!stateRefs.current.isUpdatingWord) return;

        // FIXED: Check if completion is needed after word processing
        // This ensures completion happens at the right time
        if (isComplete) {
          // Session is already complete, trigger completion transition
          triggerCompletionTransition();
          // Word process complete immediately
        } else {
          // Continue with normal flow
          setTimer('fadeInDelay', () => fadeIn(), TIMING_CONFIG.FAST.duration);
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
      updateWord,
      fadeIn,
      isComplete,
      triggerCompletionTransition,
      setTimer,
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
      title: 'Review Audio', // Assuming a default title for now
      duration: 0,
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
    (confidence: 'known' | 'vague' | 'unknown') => {
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

      // Update session metrics using hook
      updateMetrics(confidence, currentWord?.fsrs_stability ?? undefined);

      // Start transition animation
      setTimer(
        'initialTransition',
        () => {
          if (controller.signal.aborted) return;

          // Clean up any playing audio before proceeding
          stopAudioSafely();

          // VAGUE WORDS: Very snappy transition with brief fade for consistency
          if (confidence === 'vague') {
            timeRefs.current.lastVagueTime = Date.now();
            fadeOut();
            setTimer(
              'fadeAnimationVague',
              () => {
                if (controller.signal.aborted) return;
                processFeedback(confidence, controller);
              },
              80,
            ); // Very snappy 80ms fade
            return;
          }

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
          if (confidence === 'unknown') {
            setTimer(
              'fadeAnimationUnknown',
              () => {
                if (controller.signal.aborted) return;

                // Show translation overlay with red text
                displayMeaning(confidence);

                // Play English feedback audio
                if (currentWord?.root?.audio_url_en) {
                  const englishAudioUrl = generateAudioUrl(currentWord.root.audio_url_en);
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
          }
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
      updateMetrics,
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

  // Effect: Initialize audio session when practice starts
  useEffect(() => {
    if (wordQueue && wordQueue.length > 0 && !isComplete) {
      // Stop any existing audio from other sessions (like listen tab)
      stopAudioSafely();

      // Pre-configure audio session in background to reduce first audio delay
      audioPlayerRef.current.preconfigureAudioSession?.().catch(() => {
        // Ignore pre-configuration errors - session will be configured on first play
      });
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
    // generateAudioUrl is a pure utility function - no need in dependency array
    const audioUrl = generateAudioUrl(currentWord.root.audio_url);

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
    // Gesture swipe left - after hesitation: unknown, otherwise: unknown
    handleKnowledgeResponse('unknown');
  }, [handleKnowledgeResponse, isComplete]);

  const handleSwipeRight = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWordRef.current) return;
    // Gesture swipe right - after hesitation: vague, otherwise: known
    const confidence = isHesitating.value ? 'vague' : 'known';
    handleKnowledgeResponse(confidence);
  }, [handleKnowledgeResponse, isComplete, isHesitating]);

  const handleLongPress = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWordRef.current) return;
    handleKnowledgeResponse('vague');
  }, [isComplete, handleKnowledgeResponse]);

  // Hesitation callbacks - stable with refs
  const handleHesitationStart = useCallback(() => {
    isHesitating.value = true;
    // Track which word this hesitation is for using ref for stability
    hesitationWordKeyRef.current = currentWordKeyRef.current;
  }, [isHesitating]);

  const handleHesitationEnd = useCallback(() => {
    isHesitating.value = false;
    hesitationWordKeyRef.current = '';
  }, [isHesitating]);

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
        queryClient.invalidateQueries({ queryKey: fsrsQueries.stats(user.id).queryKey });

        // Eagerly refetch to update counts immediately
        queryClient.refetchQueries({ queryKey: fsrsQueries.all(user.id).queryKey });
        queryClient.refetchQueries({ queryKey: fsrsQueries.due(user.id).queryKey });
        queryClient.refetchQueries({ queryKey: fsrsQueries.stats(user.id).queryKey });
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
            router.replace(ROUTE_PATHS.STUDY_TAB);
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
    return () => {
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
      timeRefs.current.lastVagueTime = null;
      timeRefs.current.lastProgressUpdate = Date.now();
    };
  }, [fadeIn, stopAudioSafely, clearAllTimers]);

  return {
    currentSentence,
    currentMeaning,
    currentWord,
    showTranslation,
    isVagueMeaning,
    isComplete,
    isUpdating: isUpdatingUI,
    isLoading,
    wordQueue,
    progress,
    maxProgress: stateRefs.current.maxProgress,
    wordFontSize,
    currentWordKey,
    handleSwipeLeft,
    handleSwipeRight,
    handleLongPress,
    handleClose,
    transparentStyle: opacityStyle,
    sessionMetrics,
    isHesitating,
    handleHesitationStart,
    handleHesitationEnd,
    isAudioPreloading,
    audioPreloadProgress,
    isAudioPreloadingComplete,
  };
}
