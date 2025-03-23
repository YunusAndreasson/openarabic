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
import Toast from 'react-native-toast-message';
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

  // Create animated styles for the container - optimize to run on UI thread
  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: isTransitioningToCompletion ? opacity.value : 1,
    };
  }, [isTransitioningToCompletion]);

  // Define completion transition function that both paths can use
  const triggerCompletionTransition = useCallback(() => {
    // Prevent duplicate transitions
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    if (__DEV__) {
      console.log('Triggering completion transition');
    }

    // Set progress to 100% immediately
    maxProgressRef.current = 100;
    setProgressAnimationKey(prev => prev + 1);

    // Start transition to completion screen
    setIsTransitioningToCompletion(true);

    // Fade out current screen using our standard animation config
    opacity.value = withTiming(0, ANIMATION_CONFIG);

    // Wait for animation to complete
    if (completionTransitionRef.current) {
      clearTimeout(completionTransitionRef.current);
    }

    completionTransitionRef.current = setTimeout(() => {
      setIsTransitioningToCompletion(false);
    }, 350);
  }, [opacity]);

  // Initialize FSRS hook with our completion handler
  const { currentWord, isLoading, isComplete, progress, updateWord, invalidateQueries } = useFSRS({
    userId: user?.id,
    onComplete: triggerCompletionTransition,
  });

  // Update progress tracking
  useEffect(() => {
    if (!isLoading && progress !== undefined) {
      if (__DEV__) {
        console.log('[Progress Update]', {
          progress,
          isComplete,
        });
      }

      // Only update maxProgress and trigger animation if progress actually increased
      if (progress > maxProgressRef.current) {
        // Update maxProgress
        maxProgressRef.current = progress;

        // Only force progress bar animation refresh when there's a visual change
        setProgressAnimationKey(prev => prev + 1);

        if (__DEV__) {
          console.log('[Progress Animation] Triggering animation, progress:', progress);
        }
      }
    }
  }, [isLoading, progress, isComplete]);

  // Initialize totalWordsRef when the session starts
  useEffect(() => {
    if (!isLoading && progress !== undefined && totalWordsRef.current === 0) {
      // The initial progress percentage represents 1 word out of the total
      // So if progress is 33%, then total words is 3 (100/33)
      const calculatedTotal = Math.round(100 / (progress || 100));
      totalWordsRef.current = calculatedTotal;
      if (__DEV__) {
        console.log('[Progress Init] Setting total words:', calculatedTotal);
      }
    }
  }, [isLoading, progress]);

  // Use our custom hook for word sizing with simplified approach
  const wordFontSize = useWordSizing(currentWord?.sentence_word.word_form, {
    minFontSize: 50,
    maxFontSize: 100, // Fixed font size for most words
  });

  // Hide initial loading after a short delay
  useEffect(() => {
    if (showInitialLoading) {
      const timer = setTimeout(() => {
        setShowInitialLoading(false);
      }, 300); // Enough time for data to load

      return () => clearTimeout(timer);
    }
  }, [showInitialLoading]);

  // Update current sentence when currentWord changes
  useEffect(() => {
    if (__DEV__) {
      console.log('[Word Change Effect]', {
        currentWord: currentWord?.sentence_word.word_form,
        currentSentence: currentSentence.wordForm,
        isUpdating: isUpdatingWordRef.current,
        isComplete,
        isTransitioning: isTransitioningToCompletion,
      });
    }

    if (currentWord && !isComplete && !isTransitioningToCompletion) {
      const wordForm = currentWord.sentence_word.word_form;
      setCurrentSentence({ wordForm });
    }
  }, [currentWord, isComplete, isTransitioningToCompletion]);

  // Update effect to properly handle isComplete changes
  // Optimized to only run when the relevant conditions might have changed
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      if (__DEV__) {
        console.log('isComplete changed to true, triggering completion transition');
      }
      triggerCompletionTransition();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition]);

  // Handle swipe left (don't know)
  const handleSwipeLeft = useCallback(() => {
    if (__DEV__) {
      console.log('[Swipe Left] Starting with word:', currentWord?.sentence_word.word_form);
    }

    // Check for concurrent updates with a local guard
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      if (__DEV__) {
        console.log('[Swipe Left] Blocked - already updating or completing');
      }
      return;
    }

    // Set local concurrency guard
    isUpdatingWordRef.current = true;

    // Add haptic feedback for don't know - using very light feedback
    lightFeedback();

    // First fade out the current word - use proper worklet annotation
    const animateFadeOut = () => {
      'worklet';
      opacity.value = withTiming(0, ANIMATION_CONFIG);
    };
    animateFadeOut();

    // For failures, always update animation key even if progress doesn't change
    // This ensures the animation is triggered for feedback
    setProgressAnimationKey(prev => prev + 1);

    // Clear any existing timeouts to prevent memory leaks
    if (meaningTimeoutRef.current) {
      clearTimeout(meaningTimeoutRef.current);
      meaningTimeoutRef.current = null;
    }

    try {
      // Wait for the fade out to complete
      setTimeout(() => {
        try {
          // Store the current word's meaning before updating
          if (currentWord?.sentence_word?.english) {
            setCurrentMeaning(currentWord.sentence_word.english);
          } else {
            setCurrentMeaning('No translation available');
          }

          // Show the meaning overlay
          setShowMeaningOverlay(true);
          if (__DEV__) {
            console.log('[Swipe Left] Showing meaning overlay');
          }

          // Hide the meaning after a delay
          meaningTimeoutRef.current = setTimeout(() => {
            try {
              if (__DEV__) {
                console.log('[Swipe Left] Hiding meaning overlay');
              }
              setShowMeaningOverlay(false);

              // Update the word status after showing the meaning
              if (currentWord?.sentence_word_id) {
                if (__DEV__) {
                  console.log('[Swipe Left] Updating word in database');
                }
                updateWord(currentWord.sentence_word_id, false)
                  .then(() => {
                    if (__DEV__) {
                      console.log('[Swipe Left] Word updated successfully');
                    }
                    // Fade in the new word after the update
                    opacity.value = withTiming(1, ANIMATION_CONFIG);
                    // Reset the concurrency guard immediately
                    isUpdatingWordRef.current = false;
                  })
                  .catch(error => {
                    console.error('[Swipe Left] Error updating word:', error);
                    Toast.show({
                      type: 'error',
                      text1: 'Error',
                      text2: 'Failed to update word. Please try again.',
                      position: 'bottom',
                    });
                    // Fade in even on error
                    opacity.value = withTiming(1, ANIMATION_CONFIG);
                    isUpdatingWordRef.current = false;
                  });
              } else {
                // Fade in if no word to update
                opacity.value = withTiming(1, ANIMATION_CONFIG);
                isUpdatingWordRef.current = false;
              }
            } catch (error) {
              console.error('[Swipe Left] Error in meaning timeout:', error);
              opacity.value = withTiming(1, ANIMATION_CONFIG);
              isUpdatingWordRef.current = false;
            }
          }, 1000);
        } catch (error) {
          console.error('[Swipe Left] Error after fade out:', error);
          opacity.value = withTiming(1, ANIMATION_CONFIG);
          isUpdatingWordRef.current = false;
        }
      }, 150); // Time for fade out to complete
    } catch (error) {
      console.error('[Swipe Left] Error in handleSwipeLeft:', error);
      opacity.value = withTiming(1, ANIMATION_CONFIG);
      isUpdatingWordRef.current = false;
    }
  }, [currentWord, updateWord, isTransitioningToCompletion, isComplete, opacity]);

  // Handle swipe right (know the word)
  const handleSwipeRight = useCallback(() => {
    if (__DEV__) {
      console.log('[Swipe Right] Starting with word:', currentWord?.sentence_word.word_form);
    }

    // Check for concurrent updates with a local guard - combine conditions
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      if (__DEV__) {
        console.log('[Swipe Right] Blocked - already updating or completing');
      }
      return;
    }

    // Set local concurrency guard
    isUpdatingWordRef.current = true;

    // Simple fade out - use proper worklet annotation
    const animateFadeOut = () => {
      'worklet';
      opacity.value = withTiming(0, ANIMATION_CONFIG);
    };
    animateFadeOut();

    // Update the word in the database
    if (currentWord?.sentence_word_id) {
      updateWord(currentWord.sentence_word_id, true)
        .then(() => {
          if (__DEV__) {
            console.log('[Swipe Right] Word updated successfully');
          }
          // Reset update guard and fade back in
          isUpdatingWordRef.current = false;

          // Use proper worklet for fade in
          const animateFadeIn = () => {
            'worklet';
            opacity.value = withTiming(1, ANIMATION_CONFIG);
          };
          animateFadeIn();
        })
        .catch(error => {
          console.error('[Swipe Right] Error:', error);
          isUpdatingWordRef.current = false;

          // Use proper worklet for fade in on error
          const animateFadeIn = () => {
            'worklet';
            opacity.value = withTiming(1, ANIMATION_CONFIG);
          };
          animateFadeIn();
        });
    } else {
      isUpdatingWordRef.current = false;

      // Use proper worklet for fade in
      const animateFadeIn = () => {
        'worklet';
        opacity.value = withTiming(1, ANIMATION_CONFIG);
      };
      animateFadeIn();
    }
  }, [currentWord, updateWord, isTransitioningToCompletion, isComplete, opacity]);

  // Handle close button press
  const queryClient = useQueryClient();
  const handleClose = useCallback(() => {
    lightFeedback(); // Changed from mediumFeedback to lightFeedback for consistency

    // First invalidate the queries to ensure the vocabulary screen gets updated data
    invalidateQueries();

    // Force immediate invalidation of the dueWords query to ensure it's refetched
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });

      // Remove any cached data to force a fresh fetch
      queryClient.removeQueries({ queryKey: ['dueWords', user.id] });
      queryClient.removeQueries({ queryKey: ['studyWords', user.id] });
      queryClient.removeQueries({ queryKey: ['vocabularyStats'] });
    }

    // Add a small delay to ensure the queries are invalidated before navigating back
    setTimeout(() => {
      router.back();
    }, 100); // Small delay to ensure haptic feedback is felt and queries are invalidated
  }, [invalidateQueries, user?.id, queryClient]);

  // Clean up all timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = null;
      }

      if (completionTransitionRef.current) {
        clearTimeout(completionTransitionRef.current);
        completionTransitionRef.current = null;
      }

      // Reset completion trigger on unmount
      completionTriggeredRef.current = false;
      isUpdatingWordRef.current = false;
    };
  }, []);

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
            <InstructionFooter />
          </>
        )}
      </Animated.View>
    </ThemedView>
  );
}
