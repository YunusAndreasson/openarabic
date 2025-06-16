import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { InteractionManager } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRS } from '@/hooks/vocabulary/useFSRS';
import { useWordManagement } from '@/hooks/vocabulary/useWordManagement';
import { useWordSizing } from '@/hooks/vocabulary/useWordSizing';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { SessionMetrics, WordConfidence } from '@/types/review.types';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

// Consolidated refs for easier state management
interface ReviewTimeRefs {
  lastVagueTime: number | null;
  lastProgressUpdate: number;
  lastProcessedWordId: string | null;
}

interface ReviewStateRefs {
  meaningTimeout: ReturnType<typeof setTimeout> | null;
  completionTransition: ReturnType<typeof setTimeout> | null;
  timeoutRef: ReturnType<typeof setTimeout> | null;
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
  showMeaningOverlay: boolean;
  currentMeaning: string;
  currentSentence: { wordForm: string };
  isTransitioningToCompletion: boolean;
  opacity: SharedValue<number>;
  isComplete: boolean;
  isUpdating: boolean;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  wordFontSize: number;
  currentWordKey: string;
  isVagueMeaning: boolean;
  isStruggling: boolean;
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handleTap: () => void;
  handleLongPress: () => void;
  handleClose: () => void;
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  sessionMetrics: SessionMetrics;
  // Word management
  isWordManagementVisible: boolean;
  selectedWordForManagement: StudyWord | null;
  hideWordManagement: () => void;
  handleRemoveFromStudy: (word: StudyWord) => Promise<void>;
  handleResetProgress: (word: StudyWord) => Promise<void>;
  handleSkipForToday: (word: StudyWord) => Promise<void>;
  handleMarkAsEasy: (word: StudyWord) => Promise<void>;
  handleMarkAsHard: (word: StudyWord) => Promise<void>;
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
  initial: 150, // Initial delay before animation (was 200)
  fadeAnimation: 200, // Delay for fade animation (was 300)
  meaningDisplay: {
    normal: 1500, // Display time for meaning overlay (was 2000)
    struggling: 2500, // Display time for struggling words (was 3000)
  },
};

export function useReview({ fromRemember, onClose }: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use enhanced audio player instead of local expo-av implementation
  const audioPlayer = useAudioPlayer();

  // Create stable refs for audio player methods to avoid dependency issues
  const audioPlayerRef = useRef(audioPlayer);
  audioPlayerRef.current = audioPlayer;

  // Use optimized opacity animation from hooks/animations
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 1,
    duration: TRANSITION_DELAYS.fadeAnimation,
  });

  // UI state
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [isVagueMeaning, setIsVagueMeaning] = useState(false);
  const [isStruggling, setIsStruggling] = useState(false);

  // Consolidated time tracking refs
  const timeRefs = useRef<ReviewTimeRefs>({
    lastVagueTime: null,
    lastProgressUpdate: Date.now(),
    lastProcessedWordId: null,
  });

  // Consolidated state refs
  const stateRefs = useRef<ReviewStateRefs>({
    meaningTimeout: null,
    completionTransition: null,
    timeoutRef: null,
    maxProgress: 0,
    completionTriggered: false,
    isUpdatingWord: false,
    progressUpdatedForCompletion: false,
  });

  // Session metrics tracking
  const sessionMetricsRef = useRef<SessionMetrics>({
    wordsReviewed: 0,
    wordsKnown: 0,
    wordsVague: 0,
    wordsUnknown: 0,
    averageStabilityIncrease: 0,
    longestStreak: 0,
    currentStreak: 0,
    masteredWords: 0,
    startTime: Date.now(),
  });

  const triggerCompletionTransition = useCallback(() => {
    if (stateRefs.current.completionTriggered) return;
    stateRefs.current.completionTriggered = true;

    // Stop any playing audio to free resources
    audioPlayerRef.current.actions.stopPlayback().catch(() => {});
    setIsTransitioningToCompletion(true);
    fadeOut();

    stateRefs.current.maxProgress = 100;
    setProgressAnimationKey(prev => prev + 1);

    if (stateRefs.current.completionTransition) {
      clearTimeout(stateRefs.current.completionTransition);
    }

    stateRefs.current.completionTransition = setTimeout(() => {
      if (stateRefs.current.completionTriggered) {
        setIsTransitioningToCompletion(false);
      }
    }, 200);
  }, [fadeOut]);

  const { currentWord, isComplete, progress, updateWord, invalidateQueries } = useFSRS({
    userId: user?.id,
    onComplete: triggerCompletionTransition,
    useAllWords: fromRemember, // When fromRemember is true, use all words instead of just due words
  });

  // Word management integration
  const {
    isModalVisible: isWordManagementVisible,
    selectedWord: selectedWordForManagement,
    showWordManagement,
    hideWordManagement,
    handleRemoveFromStudy,
    handleResetProgress,
    handleSkipForToday,
    handleMarkAsEasy,
    handleMarkAsHard,
  } = useWordManagement({
    onWordRemoved: () => {
      // Refresh the current session after word removal
      invalidateQueries();
    },
    onWordUpdated: () => {
      // Refresh the current session after word update
      invalidateQueries();
    },
  });

  const wordFontSize = useWordSizing(currentWord?.root?.letters, fontConfig);

  // Derive currentSentence directly from currentWord to avoid timing issues
  const currentSentence = useMemo(() => {
    const wordForm = currentWord?.root?.letters || '';
    return { wordForm };
  }, [currentWord]);

  // Unique key for the current word to trigger renders even if the text is identical
  const currentWordKey = useMemo(
    () =>
      currentWord
        ? `${currentWord.root_id}-${currentWord.fsrs_last_review ?? ''}-${
            currentWord.fsrs_reps ?? 0
          }`
        : 'none',
    [currentWord]
  );

  // Batch state updates for meaning overlay
  const showMeaningWithTimeout = useCallback(
    (meaning: string, isVague: boolean, isStruggling: boolean = false) => {
      setCurrentMeaning(meaning);
      setIsVagueMeaning(isVague);
      setShowMeaningOverlay(true);
      setIsStruggling(isStruggling);

      return setTimeout(
        () => {
          setShowMeaningOverlay(false);
          setIsStruggling(false);
        },
        isStruggling
          ? TRANSITION_DELAYS.meaningDisplay.struggling
          : TRANSITION_DELAYS.meaningDisplay.normal
      );
    },
    []
  );

  // Shows meaning overlay if needed
  const displayMeaning = useCallback(
    (confidence: WordConfidence, isStruggling: boolean) => {
      if (confidence === 'known') return null;

      const meaning = currentWord?.root?.meaning || 'No translation available';
      return showMeaningWithTimeout(meaning, confidence === 'vague', isStruggling);
    },
    [currentWord?.root?.meaning, showMeaningWithTimeout]
  );

  // Determines if the user is struggling with this word
  const checkIsStruggling = useCallback(
    (confidence: WordConfidence): boolean => {
      if (confidence !== 'vague') return false;

      const now = Date.now();
      return (
        timeRefs.current.lastVagueTime !== null &&
        now - timeRefs.current.lastVagueTime < 24 * 60 * 60 * 1000 && // Within 24 hours
        (currentWord?.fsrs_stability ?? 0) < 15
      );
    },
    [currentWord?.fsrs_stability]
  );

  // Process the word update in FSRS
  const processFeedback = useCallback(
    async (confidence: WordConfidence, isStruggling: boolean, controller: AbortController) => {
      if (!currentWord?.root_id || controller.signal.aborted) {
        return;
      }

      try {
        // If struggling, treat it more like 'unknown' than 'vague'
        const effectiveConfidence = isStruggling ? 'unknown' : confidence;
        await updateWord(currentWord.root_id, effectiveConfidence);

        if (!stateRefs.current.isUpdatingWord) return;

        setTimeout(() => fadeIn(), 150);
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)));
        if (!stateRefs.current.isUpdatingWord) return;
        fadeIn();
      } finally {
        stateRefs.current.isUpdatingWord = false;
        if (stateRefs.current.meaningTimeout) {
          clearTimeout(stateRefs.current.meaningTimeout);
          stateRefs.current.meaningTimeout = null;
        }
      }
    },
    [currentWord?.root_id, updateWord, fadeIn]
  );

  // Enhanced audio playback function for single audio files
  const playAudio = useCallback((url: string) => {
    if (!url) return Promise.resolve();

    const track: EnhancedAudioTrack = {
      id: `review-${Date.now()}`,
      audioUrl: url,
      title: 'Review Audio',
      duration: 0,
    };

    return audioPlayerRef.current.actions.startEnhancedPlayback([track], 0).catch(error => {
      handleError(error instanceof Error ? error : new Error(String(error)));
    });
  }, []);

  // Enhanced audio playback for English feedback (non-blocking)
  const playEnglishFeedback = useCallback((url: string) => {
    if (!url) return Promise.resolve();

    const feedbackTrack: EnhancedAudioTrack = {
      id: `feedback-${Date.now()}`,
      audioUrl: url,
      title: 'English Feedback',
      duration: 0,
    };

    return audioPlayerRef.current.actions.startEnhancedPlayback([feedbackTrack], 0).catch(error => {
      handleError(error instanceof Error ? error : new Error(String(error)));
    });
  }, []);

  const handleKnowledgeResponse = useCallback(
    (confidence: WordConfidence) => {
      // Guard conditions: exit early if we're already in a processing state
      if (
        stateRefs.current.isUpdatingWord ||
        isTransitioningToCompletion ||
        isComplete ||
        stateRefs.current.completionTriggered
      ) {
        return;
      }

      // Set updating flag immediately to prevent concurrent processing
      stateRefs.current.isUpdatingWord = true;

      const controller = new AbortController();

      // Update session metrics
      const metrics = sessionMetricsRef.current;
      metrics.wordsReviewed++;

      // Track response types
      if (confidence === 'known') {
        metrics.wordsKnown++;
        metrics.currentStreak++;
        metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);

        // Check if word is now mastered (stability >= 5 days after this review)
        const currentStability = currentWord?.fsrs_stability ?? 0;
        if (currentStability >= 4) {
          // Likely to reach 5+ after this review
          metrics.masteredWords++;
        }
      } else if (confidence === 'vague') {
        metrics.wordsVague++;
        metrics.currentStreak = 0; // Reset streak on vague
      } else {
        metrics.wordsUnknown++;
        metrics.currentStreak = 0; // Reset streak on unknown
      }

      // Calculate average stability increase (simplified estimation)
      if (currentWord?.fsrs_stability) {
        const estimatedIncrease =
          confidence === 'known'
            ? currentWord.fsrs_stability * 0.3
            : confidence === 'vague'
            ? currentWord.fsrs_stability * 0.1
            : 0;
        const totalIncrease =
          metrics.averageStabilityIncrease * (metrics.wordsReviewed - 1) + estimatedIncrease;
        metrics.averageStabilityIncrease = totalIncrease / metrics.wordsReviewed;
      }

      // Start transition animation
      setTimeout(() => {
        if (controller.signal.aborted) return;

        // Clean up any playing audio before proceeding
        audioPlayerRef.current.actions.stopPlayback().catch(() => {});
        fadeOut();

        setTimeout(() => {
          if (controller.signal.aborted) return;

          // Determine if user is struggling with this word
          const isStruggling = checkIsStruggling(confidence);

          // Update UI with meaning if needed
          stateRefs.current.meaningTimeout = displayMeaning(confidence, isStruggling);

          // Play English feedback audio for vague/unknown responses
          if (
            (confidence === 'vague' || confidence === 'unknown') &&
            currentWord?.root?.audio_url_en
          ) {
            playEnglishFeedback(currentWord.root.audio_url_en);
          }

          // Track vague responses for future struggle detection
          if (confidence === 'vague') {
            timeRefs.current.lastVagueTime = Date.now();
          }

          // Schedule the actual word processing
          if (confidence === 'unknown' || confidence === 'vague') {
            stateRefs.current.meaningTimeout = setTimeout(
              () => {
                // Process feedback after meaning display timeout
                processFeedback(confidence, isStruggling, controller);
              },
              isStruggling
                ? TRANSITION_DELAYS.meaningDisplay.struggling
                : TRANSITION_DELAYS.meaningDisplay.normal
            );
          } else {
            // For "known" responses, process immediately with minimum delay
            processFeedback(confidence, isStruggling, controller);
          }
        }, TRANSITION_DELAYS.fadeAnimation);
      }, TRANSITION_DELAYS.initial);

      return () => controller.abort();
    },
    [
      isTransitioningToCompletion,
      isComplete,
      fadeOut,
      checkIsStruggling,
      displayMeaning,
      processFeedback,
      playEnglishFeedback,
      currentWord?.root?.audio_url_en,
      currentWord?.fsrs_stability,
    ]
  );

  // Effect: Handle completion transition
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !stateRefs.current.completionTriggered) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      // Ensure any remaining audio is stopped
      audioPlayerRef.current.actions.stopPlayback().catch(() => {});
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition]);

  // Effect: Update progress bar
  useEffect(() => {
    // Don't update during transition to completion to avoid cycles
    if (isTransitioningToCompletion) return;

    if (!isComplete && progress !== undefined) {
      const now = Date.now();
      if (now - timeRefs.current.lastProgressUpdate < 100) {
        return;
      }

      const safeProgress = Math.min(100, Math.max(0, progress));
      if (safeProgress > stateRefs.current.maxProgress) {
        stateRefs.current.maxProgress = safeProgress;
        setProgressAnimationKey(prev => prev + 1);
        timeRefs.current.lastProgressUpdate = now;
      }

      // Only update if not already at 100% to prevent cycles
      if (isComplete && stateRefs.current.maxProgress < 100) {
        stateRefs.current.maxProgress = 100;
        // Use a ref to track if we've already updated this cycle
        if (!stateRefs.current.progressUpdatedForCompletion) {
          stateRefs.current.progressUpdatedForCompletion = true;
          setProgressAnimationKey(prev => prev + 1);
        }
      }
    }
  }, [isComplete, progress, isTransitioningToCompletion]);

  // Effect: Ensure 100% progress on completion
  useEffect(() => {
    // Skip if we've already updated or if we're transitioning
    if (
      isComplete &&
      !isTransitioningToCompletion &&
      !stateRefs.current.progressUpdatedForCompletion
    ) {
      stateRefs.current.maxProgress = 100;
      stateRefs.current.progressUpdatedForCompletion = true;
      setProgressAnimationKey(prev => prev + 1);
    }

    // Reset the flag when completion state changes
    if (!isComplete) {
      stateRefs.current.progressUpdatedForCompletion = false;
    }
  }, [isComplete, isTransitioningToCompletion]);

  // Effect: Handle current word changes and preload audio
  useEffect(() => {
    if (stateRefs.current.completionTriggered || isComplete || isTransitioningToCompletion) {
      return;
    }

    if (currentWord?.root) {
      const wordId = String(currentWord.root_id || 'unknown');
      const audioUrl = currentWord.root.audio_url;

      // ALWAYS play audio for Arabic words
      if (audioUrl) {
        playAudio(audioUrl).catch(handleError);
      }

      // Update the lastProcessedWordId after playing audio
      timeRefs.current.lastProcessedWordId = wordId;
    }
  }, [currentWord, isComplete, isTransitioningToCompletion, playAudio]);

  const handleSwipeLeft = useCallback(() => {
    // Removed haptic feedback for swipe left
    handleKnowledgeResponse('unknown');
  }, [handleKnowledgeResponse]);

  const handleSwipeRight = useCallback(() => {
    // No haptic feedback for "known" response
    handleKnowledgeResponse('known');
  }, [handleKnowledgeResponse]);

  const handleTap = useCallback(() => {
    // Removed haptic feedback for tap (vague)
    handleKnowledgeResponse('vague');
  }, [handleKnowledgeResponse]);

  const handleLongPress = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWord) return;

    showWordManagement(currentWord);
  }, [currentWord, isComplete, showWordManagement]);

  const handleClose = useCallback(() => {
    const mounted = { current: true };
    // Stop any playing audio when closing
    audioPlayerRef.current.actions.stopPlayback().catch(() => {});

    if (!mounted.current) return;

    // Defer query invalidation until after navigation animation completes
    InteractionManager.runAfterInteractions(() => {
      if (!mounted.current) return;

      invalidateQueries();

      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) });
        queryClient.invalidateQueries({ queryKey: ['vocabulary-stats'] });
      }
    });

    setTimeout(() => {
      if (mounted.current) {
        if (onClose) {
          onClose();
        } else if (fromRemember) {
          router.replace('/(tabs)/practice');
        } else {
          router.back();
        }
      }
    }, 100);

    return () => {
      mounted.current = false;
    };
  }, [invalidateQueries, user?.id, queryClient, onClose, router]);

  // Cleanup effect
  useEffect(() => {
    const controller = new AbortController();

    return () => {
      controller.abort();
      stateRefs.current.completionTriggered = true;
      stateRefs.current.progressUpdatedForCompletion = false;
      fadeIn();
      audioPlayerRef.current.actions.stopPlayback().catch(() => {});

      if (stateRefs.current.meaningTimeout) {
        clearTimeout(stateRefs.current.meaningTimeout);
        stateRefs.current.meaningTimeout = null;
      }

      if (stateRefs.current.completionTransition) {
        clearTimeout(stateRefs.current.completionTransition);
        stateRefs.current.completionTransition = null;
      }

      stateRefs.current.isUpdatingWord = false;
      stateRefs.current.maxProgress = 0;
      timeRefs.current.lastProcessedWordId = null;
    };
  }, [fadeIn]);

  // Create animated style outside of render to avoid reanimated warnings
  const animatedStyle = useAnimatedStyle(
    (): ViewStyle => ({
      opacity: opacity.value,
    }),
    [opacity]
  );

  return {
    showMeaningOverlay,
    currentMeaning,
    currentSentence,
    isTransitioningToCompletion,
    opacity,
    isComplete,
    isUpdating: stateRefs.current.isUpdatingWord,
    progress,
    maxProgress: stateRefs.current.maxProgress,
    progressAnimationKey,
    wordFontSize,
    currentWordKey,
    isVagueMeaning,
    isStruggling,
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleLongPress,
    handleClose,
    animatedStyle,
    sessionMetrics: sessionMetricsRef.current,
    // Word management
    isWordManagementVisible,
    selectedWordForManagement,
    hideWordManagement,
    handleRemoveFromStudy,
    handleResetProgress,
    handleSkipForToday,
    handleMarkAsEasy,
    handleMarkAsHard,
  };
}
