import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemedView } from '@/components/ThemedView';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS } from '@/hooks/useFSRS';
import { router, useLocalSearchParams } from 'expo-router';
import { LAYOUT } from '@/constants/layout';
import { Loader } from '@/components/Loader';
import Toast from 'react-native-toast-message';
import { AnimatedItem as EntranceAnimation } from '@/components/index';
import { TIMING_CONFIG } from '@/hooks/animations';
import { useQueryClient } from '@tanstack/react-query';
import { lightFeedback, mediumFeedback } from '@/utils/haptics';
import { useWordSizing } from '../hooks/useWordSizing';

// Import our components
import {
  ReviewCard,
  ReviewHeader,
  CompletionScreen,
  MeaningOverlay,
  InstructionFooter,
} from '../components/review';

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  gestureRoot: {
    flex: 1,
    width: '100%',
  } as ViewStyle,
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
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
  const [nextSentence, setNextSentence] = useState({
    wordForm: '',
  });

  // Add state to track if we're transitioning to completion screen
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const completionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add state to control progress bar animation
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);

  // Track the previous progress value to avoid unnecessary animations
  const prevProgressRef = useRef(0);

  // Track maximum progress seen to avoid regression
  const maxProgressRef = useRef(0);

  // Track if this is the first render
  const isFirstRender = useRef(true);

  // Add ref to track if completion has been triggered
  const completionTriggeredRef = useRef(false);

  // Local concurrency guard for word updates
  const isUpdatingWordRef = useRef<boolean>(false);

  // Animation values
  const opacity = useSharedValue(1);

  // Show loading state during initial load to prevent "no words" flash
  const [showInitialLoading, setShowInitialLoading] = useState(fromVocabulary);

  // Define completion transition function that both paths can use
  const triggerCompletionTransition = useCallback(() => {
    // Prevent duplicate transitions
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    console.log('Triggering completion transition');

    // Set progress to 100% immediately
    maxProgressRef.current = 100;
    prevProgressRef.current = 100;
    setProgressAnimationKey(prev => prev + 1);

    // Start transition to completion screen
    setIsTransitioningToCompletion(true);

    // Fade out current screen
    opacity.value = withTiming(0, {
      duration: 300,
      easing: TIMING_CONFIG.MEDIUM.easing,
    });

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

  // Use our custom hook for word sizing with simplified approach
  const wordFontSize = useWordSizing(currentWord?.sentence_word.word_form, {
    minFontSize: 50,
    maxFontSize: 100, // Fixed font size for most words
  });

  // Initialize prevProgressRef and maxProgressRef with the initial progress value
  useEffect(() => {
    if (!isLoading && progress !== undefined) {
      prevProgressRef.current = progress;
      maxProgressRef.current = Math.max(maxProgressRef.current, progress);
    }
  }, [isLoading, progress]);

  // Hide initial loading after a short delay
  useEffect(() => {
    if (showInitialLoading) {
      const timer = setTimeout(() => {
        setShowInitialLoading(false);
      }, 300); // Enough time for data to load

      return () => clearTimeout(timer);
    }
  }, [showInitialLoading]);

  // Use useAnimatedReaction to safely track opacity value changes
  useAnimatedReaction(
    () => opacity.value,
    (currentOpacity, previousOpacity) => {
      // Only update the current sentence when opacity is exactly 0
      // This ensures the previous word is completely invisible before showing the new one
      if (currentOpacity === 0 && previousOpacity !== 0) {
        runOnJS(setCurrentSentence)(nextSentence);
      }
    },
    [nextSentence]
  );

  // Extract word for display - use the state version instead of direct calculation
  const { wordForm } = currentSentence;

  // Create animated styles for the container
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  }, []);

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

  // Update current sentence when currentWord changes
  useEffect(() => {
    if (currentWord) {
      const wordForm = currentWord.sentence_word.word_form;
      const newSentence = { wordForm };
      setNextSentence(newSentence);

      // Only set currentSentence immediately on first load
      if (isFirstRender.current) {
        setCurrentSentence(newSentence);
        isFirstRender.current = false;
      }
    }
  }, [currentWord]);

  // Update effect to properly handle isComplete changes
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      console.log('isComplete changed to true, triggering completion transition');
      triggerCompletionTransition();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition]);

  // Handle swipe left (don't know)
  const handleSwipeLeft = useCallback(() => {
    // Check for concurrent updates with a local guard
    if (isUpdatingWordRef.current) {
      console.log('Ignoring update request - update already in progress');
      return;
    }

    // If we're already transitioning to completion, prevent further updates
    if (isTransitioningToCompletion || isComplete || completionTriggeredRef.current) {
      return;
    }

    // Set local concurrency guard
    isUpdatingWordRef.current = true;

    // Add haptic feedback for don't know
    lightFeedback();

    // For failures, always update animation key even if progress doesn't change
    // This ensures the animation is triggered for feedback
    setProgressAnimationKey(prev => prev + 1);

    // Clear any existing timeouts to prevent memory leaks
    if (meaningTimeoutRef.current) {
      clearTimeout(meaningTimeoutRef.current);
      meaningTimeoutRef.current = null;
    }

    try {
      // Store the current word's meaning before updating
      if (currentWord?.sentence_word?.english) {
        setCurrentMeaning(currentWord.sentence_word.english);
      } else {
        setCurrentMeaning('No translation available');
      }

      // Fade in the meaning overlay
      setShowMeaningOverlay(true);

      // Hide the meaning after a delay
      meaningTimeoutRef.current = setTimeout(() => {
        try {
          setShowMeaningOverlay(false);

          // Update the word status after showing the meaning
          if (currentWord?.sentence_word_id) {
            updateWord(currentWord.sentence_word_id, false)
              .then(() => {
                // Reset the concurrency guard only after the update is complete
                setTimeout(() => {
                  isUpdatingWordRef.current = false;
                }, 16);
              })
              .catch(error => {
                console.error('Error updating word:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to update word. Please try again.',
                  position: 'bottom',
                });
                isUpdatingWordRef.current = false;
              });
          } else {
            isUpdatingWordRef.current = false;
          }
        } catch (error) {
          console.error('Error in meaning timeout:', error);
          isUpdatingWordRef.current = false;
        }
      }, 1000);
    } catch (error) {
      console.error('Error in handleSwipeLeft:', error);
      isUpdatingWordRef.current = false;
    }
  }, [currentWord, updateWord, isTransitioningToCompletion, isComplete]);

  // Handle swipe right (know the word)
  const handleSwipeRight = useCallback(() => {
    // Check for concurrent updates with a local guard
    if (isUpdatingWordRef.current) {
      console.log('Ignoring update request - update already in progress');
      return;
    }

    // If we're already transitioning to completion, prevent further updates
    if (isTransitioningToCompletion || isComplete || completionTriggeredRef.current) {
      return;
    }

    // Set local concurrency guard
    isUpdatingWordRef.current = true;

    // Update progress tracking and trigger animation only when progress actually changes
    if (progress !== prevProgressRef.current) {
      // Update max progress seen to prevent regression
      maxProgressRef.current = Math.max(maxProgressRef.current, progress);
      // Increment animation key to trigger a re-render with animation
      setProgressAnimationKey(prev => prev + 1);
      // Save current progress for next comparison
      prevProgressRef.current = progress;
    }

    try {
      // Update the word in the database
      if (currentWord?.sentence_word_id) {
        updateWord(currentWord.sentence_word_id, true)
          .then(() => {
            // Reset the concurrency guard after a short delay
            setTimeout(() => {
              isUpdatingWordRef.current = false;
            }, 16);
          })
          .catch(error => {
            console.error('Error updating word:', error);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to update word. Please try again.',
              position: 'bottom',
            });
            isUpdatingWordRef.current = false;
          });
      } else {
        isUpdatingWordRef.current = false;
      }
    } catch (error) {
      console.error('Error in handleSwipeRight:', error);
      isUpdatingWordRef.current = false;
    }
  }, [currentWord, updateWord, progress, isTransitioningToCompletion, isComplete]);

  // Handle close button press
  const queryClient = useQueryClient();
  const handleClose = useCallback(() => {
    mediumFeedback(); // Stronger haptic feedback

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
      <EntranceAnimation fullWidth>
        <GestureHandlerRootView style={baseStyles.gestureRoot}>
          <Animated.View style={[baseStyles.contentContainer, containerStyle]}>
            <ReviewHeader
              progress={progress || 0}
              maxProgress={maxProgressRef.current}
              animationKey={progressAnimationKey}
              onClose={handleClose}
            />

            <View style={{ flex: 1, justifyContent: 'center', width: '100%' }}>
              <ReviewCard
                word={wordForm}
                fontSize={wordFontSize}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isUpdating={isUpdatingWordRef.current}
                isTransitioning={isTransitioningToCompletion}
              />
            </View>

            <View style={baseStyles.footer}>
              <InstructionFooter />
            </View>
          </Animated.View>

          {/* Position MeaningOverlay at the root level for proper overlay */}
          <MeaningOverlay visible={showMeaningOverlay} meaning={currentMeaning} isWarning={true} />
        </GestureHandlerRootView>
      </EntranceAnimation>
    </ThemedView>
  );
}
