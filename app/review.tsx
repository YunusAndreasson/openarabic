import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, TextStyle, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SCREEN_WIDTH, LAYOUT } from '@/constants/layout';
import { ThemedButton } from '@/components/ThemedButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Loader } from '@/components/Loader';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import Toast from 'react-native-toast-message';
import EntranceAnimation from '@/components/EntranceAnimation';
import AnimatedItem from '@/components/AnimatedItem';
import { TIMING_CONFIG, SPRING_CONFIG } from '@/hooks/animations';

// Import our new components
import CloseButton from '../components/CloseButton';
import WordDisplay from '../components/review/WordDisplay';
import InstructionFooter from '../components/review/InstructionFooter';
import { default as MeaningOverlayComponent } from '../components/review/MeaningOverlay';
import { useWordSizing } from '../hooks/useWordSizing';

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.05;

// Use faster spring animation for swipes
const FAST_SPRING_CONFIG = {
  ...SPRING_CONFIG.CARD,
  stiffness: 250, // Higher stiffness for faster movement
  damping: 20, // Higher damping for less bounce
};

// Use a very fast fade duration for quick transitions
const FADE_DURATION = 80;

// Create a reusable animation config for consistent usage
const FAST_ANIMATION_CONFIG = {
  duration: FADE_DURATION,
  easing: TIMING_CONFIG.FAST.easing,
};

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
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    height: 50,
    marginBottom: 0,
  } as ViewStyle,
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.MEDIUM,
    marginRight: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
  textContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  } as ViewStyle,
  sentenceContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    minHeight: 120,
  } as ViewStyle,
  wordContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
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
  completionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  } as ViewStyle,
  completionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  } as TextStyle,
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  } as ViewStyle,
  emptyStateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
  } as TextStyle,
});

// Create a component for the completion screen
const CompletionScreen = React.memo(({ onClose }: { onClose: () => void }) => {
  const colors = useColors();

  return (
    <View
      style={[
        baseStyles.container,
        baseStyles.completionContainer,
        {
          backgroundColor: colors.background,
          // Ensure perfect vertical centering
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <View style={{ alignItems: 'center' }}>
        <AnimatedItem delay={100}>
          <Ionicons name="checkmark-circle" size={80} color={colors.tint} />
        </AnimatedItem>

        <AnimatedItem delay={300}>
          <ThemedText style={baseStyles.completionText}>Great job!</ThemedText>
        </AnimatedItem>

        <AnimatedItem delay={500}>
          <ThemedText style={baseStyles.completionText}>
            You've completed your review session.
          </ThemedText>
        </AnimatedItem>

        <AnimatedItem delay={700}>
          <ThemedButton
            title="Done"
            onPress={onClose}
            style={{ marginTop: LAYOUT.SPACING.LARGE }}
          />
        </AnimatedItem>
      </View>
    </View>
  );
});

// Create a component for the empty state
const EmptyStateScreen = React.memo(({ onClose }: { onClose: () => void }) => {
  const colors = useColors();

  return (
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <View style={baseStyles.emptyStateContainer}>
        <Ionicons name="information-circle-outline" size={60} color={colors.tint} />
        <ThemedText style={baseStyles.emptyStateText}>No words to review at this time.</ThemedText>
        <ThemedButton
          title="Go Back"
          onPress={onClose}
          style={{ marginTop: LAYOUT.SPACING.XLARGE }}
        />
      </View>
    </ThemedView>
  );
});

export default function ReviewScreen() {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const params = useLocalSearchParams();
  const fromVocabulary = params.fromVocabulary === 'true';
  const initialLoadRef = useRef(true);

  const { user } = useAuth();
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const meaningTimeoutRef = useRef<NodeJS.Timeout>();
  const fadeInTimeoutRef = useRef<NodeJS.Timeout>();
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [currentSentence, setCurrentSentence] = useState({
    wordForm: '',
  });
  const [nextSentence, setNextSentence] = useState({
    wordForm: '',
  });
  const [animationState, setAnimationState] = useState<
    'idle' | 'transitioning-out' | 'updating-word' | 'transitioning-in'
  >('idle');

  // Add state to control progress bar animation
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  // Track the previous progress value to avoid unnecessary animations
  const prevProgressRef = useRef(0);

  // Track if this is the first render
  const isFirstRender = useRef(true);

  const { currentWord, isLoading, isComplete, progress, updateWord, invalidateQueries } =
    useSpacedRepetition({
      userId: user?.id,
    });

  // Use our custom hook for word sizing with simplified approach
  const wordFontSize = useWordSizing(currentWord?.sentence_word.word_form, {
    minFontSize: 50,
    maxFontSize: 100, // Fixed font size for most words
  });

  // Initialize prevProgressRef with the initial progress value
  useEffect(() => {
    if (!isLoading && progress !== undefined) {
      prevProgressRef.current = progress;
    }
  }, [isLoading, progress]);

  // Show loading state during initial load to prevent "no words" flash
  const [showInitialLoading, setShowInitialLoading] = useState(fromVocabulary);

  // Hide initial loading after a short delay
  useEffect(() => {
    if (showInitialLoading) {
      const timer = setTimeout(() => {
        setShowInitialLoading(false);
      }, 300); // Enough time for data to load

      return () => clearTimeout(timer);
    }
  }, [showInitialLoading]);

  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

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

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = undefined;
      }
      if (fadeInTimeoutRef.current) {
        clearTimeout(fadeInTimeoutRef.current);
        fadeInTimeoutRef.current = undefined;
      }
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

  // Handle word update (success or failure)
  const handleWordUpdate = useCallback(
    (success: boolean) => {
      // Add haptic feedback only when swiping left (don't know the word)
      if (!success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Only trigger progress bar animation if progress has changed
      if (progress !== prevProgressRef.current) {
        setProgressAnimationKey(prev => prev + 1);
        prevProgressRef.current = progress;
      }

      // Clear any existing timeouts to prevent memory leaks
      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = undefined;
      }
      if (fadeInTimeoutRef.current) {
        clearTimeout(fadeInTimeoutRef.current);
        fadeInTimeoutRef.current = undefined;
      }

      // Handle errors in word update process
      const handleUpdateError = (error: any) => {
        console.error('Error updating word:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to update word. Please try again.',
          position: 'bottom',
        });

        // Reset animation state
        setAnimationState('idle');
        opacity.value = 1;
        translateX.value = 0;
      };

      const updateWordAndAnimate = () => {
        if (currentWord?.sentence_word_id) {
          try {
            // Update animation state to reflect that we're transitioning out
            setAnimationState('transitioning-out');

            // First update the word in the database
            updateWord(currentWord.sentence_word_id, success)
              .then(() => {
                // Reset position immediately
                translateX.value = 0;

                // Ensure opacity is exactly 0 before proceeding
                // This guarantees the current word is completely invisible
                opacity.value = 0;

                // Move to next state - we're now updating the word
                setAnimationState('updating-word');

                // Add a tiny delay before showing the next word
                // This ensures the DOM has time to update with the new word content
                setTimeout(() => {
                  // For both success and failure cases, use immediate fade-in
                  setAnimationState('transitioning-in');
                  opacity.value = withTiming(1, FAST_ANIMATION_CONFIG, () => {
                    runOnJS(setAnimationState)('idle');
                  });
                }, 16); // One frame delay at 60fps to ensure clean transition
              })
              .catch(handleUpdateError);
          } catch (error) {
            handleUpdateError(error);
          }
        }
      };

      // If the user doesn't know the word, show the meaning
      if (!success) {
        // Store the current word's meaning before updating
        if (currentWord?.sentence_word?.english) {
          setCurrentMeaning(currentWord.sentence_word.english);
        } else {
          setCurrentMeaning('No translation available');
        }

        // Fade in the meaning overlay
        setShowMeaningOverlay(true);

        // Hide the meaning after a delay - keep this the same
        const meaningDisplayTime = 1000;
        meaningTimeoutRef.current = setTimeout(() => {
          clearTimeout(meaningTimeoutRef.current);
          meaningTimeoutRef.current = undefined;
          setShowMeaningOverlay(false);
          // Update the word status after showing the meaning
          updateWordAndAnimate();
        }, meaningDisplayTime);
      } else {
        // Update the word status immediately for success
        updateWordAndAnimate();
      }
    },
    [currentWord, updateWord, opacity, translateX, nextSentence, progress]
  );

  // Create a pan gesture handler for the entire screen
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(0)
    .minDistance(1)
    .onUpdate(event => {
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - success - use faster spring animation
        translateX.value = withSpring(SCREEN_WIDTH, FAST_SPRING_CONFIG, () => {
          runOnJS(handleWordUpdate)(true);
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - failure - use faster spring animation
        translateX.value = withSpring(-SCREEN_WIDTH, FAST_SPRING_CONFIG, () => {
          runOnJS(handleWordUpdate)(false);
        });
      } else {
        // Return to center if not swiped far enough - use faster spring animation
        translateX.value = withSpring(0, FAST_SPRING_CONFIG);
      }
    });

  // Handle close button press
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Stronger haptic feedback
    setTimeout(() => {
      invalidateQueries();
      router.back();
    }, 100); // Small delay to ensure haptic feedback is felt
  }, [invalidateQueries]);

  // Create animated styles - memoize to prevent unnecessary recalculations
  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  }, []);

  // Extract word for display - use the state version instead of direct calculation
  const { wordForm } = currentSentence;

  // Memoize the word content to prevent unnecessary re-renders
  const wordContent = useMemo(
    () => <WordDisplay word={wordForm} fontSize={wordFontSize} style={baseStyles.wordContainer} />,
    [wordForm, wordFontSize]
  );

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

  // Show empty state if there are no words to review and not complete
  if (!isLoading && !currentWord && !isComplete) {
    return <EmptyStateScreen onClose={handleClose} />;
  }

  // Show completion screen if all words are reviewed
  if (isComplete) {
    return <CompletionScreen onClose={handleClose} />;
  }

  // Return the main content with entrance animation
  return (
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <EntranceAnimation>
        <GestureHandlerRootView style={baseStyles.gestureRoot}>
          <View style={baseStyles.contentContainer}>
            <View
              style={[
                baseStyles.header,
                {
                  zIndex: 999,
                  alignItems: 'center',
                  height: 44,
                },
              ]}
            >
              <View
                style={[
                  baseStyles.progressContainer,
                  {
                    marginRight: LAYOUT.SPACING.SMALL,
                  },
                ]}
              >
                <ProgressBar
                  progress={Math.round(progress)}
                  animationTriggered={true}
                  key={progressAnimationKey}
                  animationDuration={1000}
                />
              </View>
              <CloseButton onPress={handleClose} />
            </View>

            <View style={{ flex: 1, justifyContent: 'center', width: '100%' }}>
              <GestureDetector gesture={panGesture}>
                <View style={[baseStyles.textContainer, { marginTop: 0 }]}>
                  <Animated.View
                    key={`word-container-${currentWord?.sentence_word_id || 'initial'}`}
                    style={[cardStyle, baseStyles.sentenceContainer]}
                  >
                    {wordContent}
                  </Animated.View>
                </View>
              </GestureDetector>
            </View>

            <View style={baseStyles.footer}>
              <InstructionFooter />
            </View>
          </View>

          {/* Position MeaningOverlay at the root level for proper overlay */}
          <MeaningOverlayComponent
            visible={showMeaningOverlay}
            meaning={currentMeaning}
            isWarning={true}
          />
        </GestureHandlerRootView>
      </EntranceAnimation>
    </ThemedView>
  );
}
