import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, Dimensions, TextStyle, ViewStyle } from 'react-native';
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
import { ThemedModal } from '@/components/ThemedModal';
import { Loader } from '@/components/Loader';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import Toast from 'react-native-toast-message';
import EntranceAnimation from '@/components/EntranceAnimation';
import AnimatedItem from '@/components/AnimatedItem';

// Import our new components
import CloseButton from '../components/CloseButton';
import WordDisplay from '../components/review/WordDisplay';
import InstructionFooter from '../components/review/InstructionFooter';
import { default as MeaningOverlayComponent } from '../components/review/MeaningOverlay';
import { useWordSizing } from '../hooks/useWordSizing';

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.05;
const ANIMATION_CONFIG = { damping: 15, stiffness: 200 }; // Increased stiffness for faster animation
const FADE_DURATION = 100; // Reduced from 150 for quicker fade

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width * 0.9, 400);

// Create an AnimatedCompletionItem component for the completion screen

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
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0, // Remove top padding
    paddingBottom: 0, // Remove bottom padding
  } as ViewStyle,
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    height: 50, // Fixed height to minimize space taken
    marginBottom: -10, // Reduce space between header and content
  } as ViewStyle,
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.MEDIUM,
    marginRight: LAYOUT.SPACING.MEDIUM, // Add margin to separate from close button
  } as ViewStyle,
  textContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0, // Removed all padding
  } as ViewStyle,
  sentenceContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0, // Removed all padding
    minHeight: 120,
  } as ViewStyle,
  wordContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0, // Removed all padding
    minHeight: 320, // Increased from 280 to accommodate even larger text
  } as ViewStyle,
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? LAYOUT.SPACING.LARGE : LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    marginTop: 'auto',
    height: 80, // Increased for better spacing
  } as ViewStyle,
  modalInnerContent: {
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingTop: LAYOUT.SPACING.XXLARGE,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
  modalInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  modalText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    flex: 1,
  } as TextStyle,
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
});

// Create a component for the completion screen
const CompletionScreen = React.memo(({ onClose }: { onClose: () => void }) => {
  const colors = useColors();

  return (
    <View style={[baseStyles.completionContainer, { backgroundColor: colors.background }]}>
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
        <ThemedButton title="Done" onPress={onClose} style={{ marginTop: LAYOUT.SPACING.LARGE }} />
      </AnimatedItem>
    </View>
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
  const [showInstructions, setShowInstructions] = useState(false);
  const meaningTimeoutRef = useRef<NodeJS.Timeout>();
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const fadeInTimeoutRef = useRef<NodeJS.Timeout>();
  const resetTransitionRef = useRef<NodeJS.Timeout>();
  const [currentSentence, setCurrentSentence] = useState({
    wordForm: '',
  });
  const [nextSentence, setNextSentence] = useState({
    wordForm: '',
  });
  const [animationState, setAnimationState] = useState<
    'idle' | 'transitioning-out' | 'updating-word' | 'transitioning-in'
  >('idle');
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);

  // Track if this is the first render
  const isFirstRender = useRef(true);

  const { currentWord, isLoading, isComplete, progress, updateWord, invalidateQueries } =
    useSpacedRepetition({
      userId: user?.id,
    });

  // Use our custom hook for word sizing
  const wordFontSize = useWordSizing(currentWord?.sentence_word.word_form);

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
      if (currentOpacity === 0 && previousOpacity !== 0) {
        // When opacity reaches 0, update the current sentence
        runOnJS(setCurrentSentence)(nextSentence);
      }
    },
    [nextSentence]
  );

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (meaningTimeoutRef.current) clearTimeout(meaningTimeoutRef.current);
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (fadeInTimeoutRef.current) clearTimeout(fadeInTimeoutRef.current);
      if (resetTransitionRef.current) clearTimeout(resetTransitionRef.current);
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

      // Clear any existing timeouts to prevent memory leaks
      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = undefined;
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = undefined;
      }
      if (fadeInTimeoutRef.current) {
        clearTimeout(fadeInTimeoutRef.current);
        fadeInTimeoutRef.current = undefined;
      }
      if (resetTransitionRef.current) {
        clearTimeout(resetTransitionRef.current);
        resetTransitionRef.current = undefined;
      }

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

                // Set opacity to 0 immediately
                opacity.value = 0;

                // Move to next state - we're now updating the word
                setAnimationState('updating-word');

                // OPTIMIZATION: Reduce animation delays to show next word faster
                // For "knew the word" (success), use an even quicker transition
                const animationDelay = success ? 0 : 10; // Reduced from 10/30
                const animationDuration = success ? FADE_DURATION : 100; // Reduced from 150

                // OPTIMIZATION: For success case, skip the timeout completely
                if (success) {
                  // Update state to transitioning in immediately
                  setAnimationState('transitioning-in');

                  // Fade in immediately without any delay
                  opacity.value = withTiming(1, { duration: animationDuration }, () => {
                    // Use the animation completion callback to safely reset the state
                    runOnJS(setAnimationState)('idle');
                  });
                } else {
                  // For failure case, still use a small delay
                  fadeInTimeoutRef.current = setTimeout(() => {
                    // Clear the reference once executed
                    fadeInTimeoutRef.current = undefined;

                    // Update state to transitioning in
                    setAnimationState('transitioning-in');

                    // Fade in immediately without additional delay
                    opacity.value = withTiming(1, { duration: animationDuration }, () => {
                      // Use the animation completion callback to safely reset the state
                      runOnJS(setAnimationState)('idle');
                    });
                  }, animationDelay);
                }
              })
              .catch(error => {
                console.error('Error updating word:', error);
                // Show toast for error
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
              });
          } catch (error) {
            console.error('Error updating word:', error);
            // Show toast for error
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
          }
        }
      };

      // If the user doesn't know the word, show the meaning
      if (!success) {
        // Fade in the meaning overlay
        setShowMeaningOverlay(true);

        // Hide the meaning after a delay
        // OPTIMIZATION: Reduce the meaning display time for faster progression
        const meaningDisplayTime = 1000; // Reduced from 1500ms
        meaningTimeoutRef.current = setTimeout(() => {
          // Clear the reference once executed
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
    [currentWord, updateWord, opacity, translateX, nextSentence]
  );

  // Create a pan gesture handler for the entire screen
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(0) // Activate immediately
    .minDistance(1) // Minimal movement to detect swipe
    .onUpdate(event => {
      // Update the horizontal position based on the gesture
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - success
        // OPTIMIZATION: Faster spring animation for success case
        translateX.value = withSpring(SCREEN_WIDTH, { damping: 12, stiffness: 250 }, () => {
          runOnJS(handleWordUpdate)(true);
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - failure
        translateX.value = withSpring(-SCREEN_WIDTH, ANIMATION_CONFIG, () => {
          runOnJS(handleWordUpdate)(false);
        });
      } else {
        // Return to center if not swiped far enough
        translateX.value = withSpring(0, ANIMATION_CONFIG);
      }
    });

  // Handle close button press
  const handleClose = useCallback(() => {
    console.log('Close button pressed!'); // Add debug log
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Stronger haptic feedback
    setTimeout(() => {
      invalidateQueries();
      router.back();
    }, 100); // Small delay to ensure haptic feedback is felt
  }, [invalidateQueries]);

  // Memoize color-dependent styles
  const colorStyles = useMemo(
    () => ({
      cardContainer: {
        backgroundColor: colors.cardBackground,
      } as ViewStyle,
      modalContent: {
        backgroundColor: colors.cardBackground,
      } as ViewStyle,
      modalIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20, // width/2 for circular shape
        backgroundColor: colors.textOverlay,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
      } as ViewStyle,
    }),
    [colors]
  );

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

  // Check for completion and show animation
  useEffect(() => {
    if (isComplete && !showCompletionAnimation) {
      setShowCompletionAnimation(true);

      // Hide completion animation after a delay and show the completion screen
      const completionDelay = 1000; // 1 second
      const completionTimer = setTimeout(() => {
        // The isComplete condition in the render function will now show the completion screen
      }, completionDelay);

      return () => {
        clearTimeout(completionTimer);
      };
    }
    return undefined;
  }, [isComplete, showCompletionAnimation]);

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
                  animationDuration={1000}
                />
              </View>
              <CloseButton onPress={handleClose} />
            </View>

            <GestureDetector gesture={panGesture}>
              <View style={[baseStyles.textContainer, { flex: 1, marginTop: -20 }]}>
                <Animated.View
                  key={`word-${currentWord?.sentence_word_id || 'initial'}`}
                  style={[cardStyle, baseStyles.sentenceContainer]}
                >
                  {wordContent}
                </Animated.View>
              </View>
            </GestureDetector>

            <MeaningOverlayComponent
              visible={showMeaningOverlay}
              meaning={currentWord?.sentence_word?.english || ''}
            />

            <View style={baseStyles.footer}>
              <InstructionFooter />
            </View>
          </View>

          <ThemedModal
            visible={showInstructions}
            onClose={() => setShowInstructions(false)}
            useBlur={true}
            blurIntensity={isDarkMode ? 15 : 30}
            contentStyle={colorStyles.modalContent}
            useHaptics={true}
            animationDuration={250}
            showCloseButton={false}
            overlayOpacity={0.15}
          >
            <View
              style={[baseStyles.modalInnerContent, { backgroundColor: colors.cardBackground }]}
            >
              <View
                style={[
                  baseStyles.modalInstructionRow,
                  {
                    marginBottom: LAYOUT.SPACING.MEDIUM,
                    justifyContent: 'center',
                  },
                ]}
              >
                <View style={colorStyles.modalIconContainer}>
                  <Ionicons name="arrow-back" size={24} color={colors.tint} />
                </View>
                <ThemedText style={baseStyles.modalText}>
                  Swipe left if you don't know the word
                </ThemedText>
              </View>
              <View style={[baseStyles.modalInstructionRow, { justifyContent: 'center' }]}>
                <View style={colorStyles.modalIconContainer}>
                  <Ionicons name="arrow-forward" size={24} color={colors.tint} />
                </View>
                <ThemedText style={baseStyles.modalText}>
                  Swipe right if you know the word
                </ThemedText>
              </View>
            </View>
          </ThemedModal>
        </GestureHandlerRootView>
      </EntranceAnimation>
    </ThemedView>
  );
}
