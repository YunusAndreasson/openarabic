import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS } from '@/hooks/useFSRS';
import { router, useLocalSearchParams } from 'expo-router';
import { LAYOUT } from '@/constants/layout';
import { Loader } from '@/components/Loader';
import { useQueryClient } from '@tanstack/react-query';
import { lightFeedback } from '@/utils/haptics';
import { useWordSizing } from '../hooks/useWordSizing';

// Import our components
import {
  ReviewCard,
  ReviewHeader,
  CompletionScreen,
  MeaningOverlay,
  InstructionFooter,
} from '../components/review';

// Animation config with proper Easing worklet
const ANIMATION_CONFIG = {
  duration: 300,
  easing: Easing.linear,
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  } as ViewStyle,
  wordArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 280,
  } as ViewStyle,
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? LAYOUT.SPACING.LARGE : LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    marginTop: 'auto',
    height: 80,
  } as ViewStyle,
});

export default function ReviewScreen() {
  const colors = useColors();
  const params = useLocalSearchParams();
  const fromVocabulary = params.fromVocabulary === 'true';
  const initialLoadRef = useRef(true);

  const { user } = useAuth();
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const meaningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [currentSentence, setCurrentSentence] = useState({
    wordForm: '',
  });

  // Add state to track if we're transitioning to completion screen
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const completionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add state to control progress bar animation
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);

  // Track maximum progress seen to avoid regression
  const maxProgressRef = useRef(0);

  // Track the total number of words for this session
  const totalWordsRef = useRef(0);

  // Add ref to track if completion has been triggered
  const completionTriggeredRef = useRef(false);

  // Local concurrency guard for word updates
  const isUpdatingWordRef = useRef<boolean>(false);

  // Animation values
  const opacity = useSharedValue(1);

  // Show loading state during initial load to prevent "no words" flash
  const [showInitialLoading, setShowInitialLoading] = useState(fromVocabulary);

  // Add ref for last progress update time
  const lastProgressUpdateRef = useRef(Date.now());

  // Create animated styles for the container - optimize to run on UI thread
  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: isTransitioningToCompletion ? opacity.value : 1,
    };
  }, [isTransitioningToCompletion]);

  // Define completion transition function that both paths can use
  const triggerCompletionTransition = useCallback(() => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    maxProgressRef.current = 100;
    setProgressAnimationKey(prev => prev + 1);
    setIsTransitioningToCompletion(true);
    opacity.value = withTiming(0, ANIMATION_CONFIG);

    if (completionTransitionRef.current) {
      clearTimeout(completionTransitionRef.current);
    }

    completionTransitionRef.current = setTimeout(() => {
      if (completionTriggeredRef.current) {
        // Only update state if not unmounted
        setIsTransitioningToCompletion(false);
      }
    }, 350);
  }, [opacity]);

  // Initialize FSRS hook with our completion handler
  const { currentWord, isLoading, isComplete, progress, updateWord, invalidateQueries } = useFSRS({
    userId: user?.id,
    onComplete: triggerCompletionTransition,
  });

  // Update progress tracking with debounce
  useEffect(() => {
    if (!isLoading && progress !== undefined) {
      const now = Date.now();
      if (now - lastProgressUpdateRef.current < 100) {
        return; // Debounce rapid updates
      }

      const safeProgress = Math.min(100, Math.max(0, progress));
      if (safeProgress > maxProgressRef.current) {
        maxProgressRef.current = safeProgress;
        setProgressAnimationKey(prev => prev + 1);
        lastProgressUpdateRef.current = now;
      }
    }
  }, [isLoading, progress, isComplete]);

  // Initialize totalWordsRef when the session starts
  useEffect(() => {
    if (!isLoading && progress !== undefined && totalWordsRef.current === 0) {
      // Prevent division by zero and handle edge cases
      const safeProgress = Math.max(1, progress || 100);
      const calculatedTotal = Math.max(1, Math.round(100 / safeProgress));
      totalWordsRef.current = calculatedTotal;
    }
  }, [isLoading, progress]);

  // Calculate dynamic font size for Arabic words based on window width
  // Smaller screens need smaller fonts, larger screens can have larger fonts
  const dynamicFontConfig = {
    minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6, // For very small screens
    maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3, // Fixed font size for most words
    minScreenWidth: 320, // iPhone SE width
    maxScreenWidth: 500, // Tablet width threshold
  };

  // Use our custom hook for word sizing with simplified approach
  const wordFontSize = useWordSizing(currentWord?.sentence_word.word_form, dynamicFontConfig);

  // Hide initial loading after a short delay
  useEffect(() => {
    if (showInitialLoading) {
      const mounted = { current: true };
      const timer = setTimeout(() => {
        if (mounted.current) {
          setShowInitialLoading(false);
        }
      }, 300);

      return () => {
        mounted.current = false;
        clearTimeout(timer);
      };
    }
    return () => {}; // Return empty cleanup function for false case
  }, [showInitialLoading]);

  // Update current sentence when currentWord changes
  useEffect(() => {
    if (currentWord && !isComplete && !isTransitioningToCompletion) {
      const wordForm = currentWord.sentence_word.word_form;
      setCurrentSentence({ wordForm });
    }
  }, [currentWord, isComplete, isTransitioningToCompletion]);

  // Update effect to properly handle isComplete changes
  // Optimized to only run when the relevant conditions might have changed
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      triggerCompletionTransition();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition]);

  // Handle swipe left (don't know)
  const handleSwipeLeft = useCallback(() => {
    // Check for concurrent updates with a local guard
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      return;
    }

    // Set local concurrency guard
    isUpdatingWordRef.current = true;

    // Add haptic feedback for don't know
    lightFeedback();

    // Create a promise chain to ensure sequential execution
    const updateSequence = async () => {
      try {
        // First fade out the current word
        opacity.value = withTiming(0, ANIMATION_CONFIG);
        await new Promise(resolve => setTimeout(resolve, 150));

        // Store and show the meaning
        const meaning = currentWord?.sentence_word?.english || 'No translation available';
        setCurrentMeaning(meaning);
        setShowMeaningOverlay(true);

        // Wait for meaning display
        await new Promise(resolve => {
          meaningTimeoutRef.current = setTimeout(() => {
            setShowMeaningOverlay(false);
            resolve(null);
          }, 1000);
        });

        // Update the word in database
        if (currentWord?.sentence_word_id) {
          await updateWord(currentWord.sentence_word_id, false);
        }

        // Fade back in
        opacity.value = withTiming(1, ANIMATION_CONFIG);
      } catch (error) {
        console.error('[Swipe Left] Error:', error);
        opacity.value = withTiming(1, ANIMATION_CONFIG);
      } finally {
        // Always reset the guard when the sequence completes
        isUpdatingWordRef.current = false;
        if (meaningTimeoutRef.current) {
          clearTimeout(meaningTimeoutRef.current);
          meaningTimeoutRef.current = null;
        }
      }
    };

    // Start the update sequence
    updateSequence();
  }, [currentWord, updateWord, isTransitioningToCompletion, isComplete, opacity]);

  // Handle swipe right (know the word)
  const handleSwipeRight = useCallback(() => {
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      return;
    }

    isUpdatingWordRef.current = true;
    opacity.value = withTiming(0, ANIMATION_CONFIG);

    if (currentWord?.sentence_word_id) {
      updateWord(currentWord.sentence_word_id, true)
        .then(() => {
          if (!isUpdatingWordRef.current) return; // Guard against unmount
          opacity.value = withTiming(1, ANIMATION_CONFIG);
        })
        .catch(error => {
          console.error('[Swipe Right] Error:', error);
          if (!isUpdatingWordRef.current) return; // Guard against unmount
          opacity.value = withTiming(1, ANIMATION_CONFIG);
        })
        .finally(() => {
          isUpdatingWordRef.current = false;
        });
    } else {
      opacity.value = withTiming(1, ANIMATION_CONFIG);
      isUpdatingWordRef.current = false;
    }
  }, [currentWord, updateWord, isTransitioningToCompletion, isComplete, opacity]);

  // Handle close button press
  const queryClient = useQueryClient();
  const handleClose = useCallback(() => {
    const mounted = { current: true };
    lightFeedback();

    // First invalidate queries
    invalidateQueries();

    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
      queryClient.removeQueries({ queryKey: ['dueWords', user.id] });
      queryClient.removeQueries({ queryKey: ['studyWords', user.id] });
      queryClient.removeQueries({ queryKey: ['vocabularyStats'] });
    }

    // Wait for queries to be invalidated before navigating
    const navigationTimer = setTimeout(() => {
      if (mounted.current) {
        router.back();
      }
    }, 100);

    return () => {
      mounted.current = false;
      clearTimeout(navigationTimer);
    };
  }, [invalidateQueries, user?.id, queryClient]);

  // Clean up all timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Cancel any ongoing animations
      opacity.value = withTiming(1, { duration: 0 });

      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = null;
      }

      if (completionTransitionRef.current) {
        clearTimeout(completionTransitionRef.current);
        completionTransitionRef.current = null;
      }

      // Reset all refs
      completionTriggeredRef.current = false;
      isUpdatingWordRef.current = false;
      maxProgressRef.current = 0;
      totalWordsRef.current = 0;
    };
  }, [opacity]);

  // Show loading screen during initial load
  if ((isLoading && initialLoadRef.current) || showInitialLoading) {
    initialLoadRef.current = false;
    return (
      <ThemedView
        style={[baseStyles.container, { justifyContent: 'center', alignItems: 'center' }]}
        useSafeArea={true}
      >
        <Loader size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  // Show completion screen if all words are reviewed or if there are no words to review
  if (isComplete || (!isLoading && !currentWord)) {
    // Only continue with the main content during the transition animation
    if (isComplete && isTransitioningToCompletion) {
      // The opacity animation will handle the fade out
      // Continue to the main return below
    } else {
      // Otherwise show the completion screen
      return <CompletionScreen onClose={handleClose} />;
    }
  }

  // Return the main content with entrance animation
  return (
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <Animated.View style={[baseStyles.contentContainer, containerStyle]}>
        {/* Show loading state during initial load */}
        {showInitialLoading ? (
          <Loader />
        ) : isComplete ? (
          <CompletionScreen onClose={handleClose} />
        ) : (
          <>
            {/* Header with progress bar */}
            <ReviewHeader
              progress={maxProgressRef.current}
              maxProgress={maxProgressRef.current}
              animationKey={progressAnimationKey}
              onClose={handleClose}
            />

            {/* Word display area with meaning overlay */}
            <View style={baseStyles.wordArea}>
              <ReviewCard
                word={currentSentence.wordForm}
                fontSize={wordFontSize}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isUpdating={isUpdatingWordRef.current}
                isTransitioning={isTransitioningToCompletion}
                opacity={opacity}
              />
              {/* Position MeaningOverlay within the word area */}
              <MeaningOverlay
                visible={showMeaningOverlay}
                meaning={currentMeaning}
                isWarning={true}
              />
            </View>

            {/* Footer with instructions */}
            <InstructionFooter primaryText="Tap on a word to see its meaning. Long press to add to your vocabulary." />
          </>
        )}
      </Animated.View>
    </ThemedView>
  );
}
