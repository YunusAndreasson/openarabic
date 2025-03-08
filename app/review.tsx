import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SCREEN_WIDTH, LAYOUT, getArabicTextStyle } from '@/constants/layout';
import { ThemedButton } from '@/components/ThemedButton';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedModal } from '@/components/ThemedModal';
import { Loader } from '@/components/Loader';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import Toast from 'react-native-toast-message';

const BASE_FONT_SIZE = 20;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.05;
const ANIMATION_CONFIG = { damping: 15, stiffness: 200 }; // Increased stiffness for faster animation
const FADE_DURATION = 100; // Reduced from 150 for quicker fade

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width * 0.9, 400);

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureRoot: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
  textContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  sentenceContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.LARGE,
    minHeight: 120,
  },
  sentence: {
    ...getArabicTextStyle(BASE_FONT_SIZE * 1.5, {
      textAlign: 'right',
      margin: 0,
    }),
  },
  studyWord: {
    ...getArabicTextStyle(BASE_FONT_SIZE * 1.5, {
      fontWeight: '700',
      paddingVertical: LAYOUT.SPACING.MEDIUM,
      marginVertical: LAYOUT.SPACING.TINY,
    }),
  },
  dimmedText: {
    ...getArabicTextStyle(BASE_FONT_SIZE * 1.5, {
      fontWeight: '400',
    }),
  },
  meaningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  meaningText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.4,
    padding: LAYOUT.SPACING.LARGE,
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    gap: LAYOUT.SPACING.MEDIUM,
    marginTop: 'auto',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modalContent: {
    width: maxWidth,
    padding: 0,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE * 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalInnerContent: {
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingTop: LAYOUT.SPACING.XXLARGE,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  modalInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    flex: 1,
  },
  completionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  },
  completionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  },
  errorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
  completionIconContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  sentenceTextContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  sentenceText: {
    ...getArabicTextStyle(BASE_FONT_SIZE * 1.5, {
      textAlign: 'right',
      margin: 0,
    }),
  },
  highlightedWord: {
    ...getArabicTextStyle(BASE_FONT_SIZE * 1.5, {
      fontWeight: '700',
      paddingVertical: LAYOUT.SPACING.MEDIUM,
      marginVertical: LAYOUT.SPACING.TINY,
    }),
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  backButton: {
    position: 'absolute',
    top: LAYOUT.SPACING.LARGE,
    left: LAYOUT.SPACING.LARGE,
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  completionIcon: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
});

export default function ReviewScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  // Animation and gesture state
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [animationState, setAnimationState] = useState<
    'idle' | 'transitioning-out' | 'updating-word' | 'transitioning-in'
  >('idle');

  // Refs for timeouts
  const meaningTimeoutRef = useRef<NodeJS.Timeout>();
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const fadeInTimeoutRef = useRef<NodeJS.Timeout>();
  const resetTransitionRef = useRef<NodeJS.Timeout>();
  const isFirstRender = useRef(true);

  // UI state
  const [showMeaning, setShowMeaning] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [currentSentence, setCurrentSentence] = useState<{
    beforeWord: string;
    wordForm: string;
    afterWord: string;
  } | null>(null);
  const [nextSentence, setNextSentence] = useState<{
    beforeWord: string;
    wordForm: string;
    afterWord: string;
  } | null>(null);

  // Get spaced repetition hook
  const { currentWord, updateWord, progress, isComplete, isLoading, transitionType } =
    useSpacedRepetition({
      userId: user?.id,
      onComplete: () => {
        // Handle completion
      },
    });

  // Extract word and sentence from current word
  useEffect(() => {
    if (currentWord && currentWord.sentence_word) {
      // Extract the word form and sentence
      const { word_form: wordForm, sentence } = currentWord.sentence_word;
      const sentenceText = typeof sentence === 'string' ? sentence : sentence?.arabic || '';

      // Find the word in the sentence
      const wordIndex = sentenceText.indexOf(wordForm);

      if (wordIndex === -1) {
        // Handle case where word is not found in sentence
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not find word in sentence. Please try again.',
          position: 'bottom',
        });
        return;
      }

      // Split the sentence into parts
      const beforeWord = sentenceText.substring(0, wordIndex);
      const afterWord = sentenceText.substring(wordIndex + wordForm.length);

      // Store the next sentence for animation
      const newSentence = { beforeWord, wordForm, afterWord };
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
                  // For failure case, use a small delay to ensure the new word is loaded before fading in
                  fadeInTimeoutRef.current = setTimeout(() => {
                    // Update state to transitioning in
                    setAnimationState('transitioning-in');

                    // Fade in with timing
                    opacity.value = withTiming(1, { duration: animationDuration }, () => {
                      // Use the animation completion callback to safely reset the state
                      runOnJS(setAnimationState)('idle');
                    });
                  }, animationDelay);
                }
              })
              .catch(error => {
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

      // If showing meaning, hide it first
      if (showMeaning) {
        setShowMeaning(false);
        // Wait a bit before updating the word to allow the meaning to hide
        setTimeout(updateWordAndAnimate, 100);
      } else {
        // Otherwise update immediately
        updateWordAndAnimate();
      }
    },
    [currentWord, showMeaning, translateX, opacity, updateWord]
  );

  // Show meaning overlay
  const handleShowMeaning = useCallback(() => {
    // Only show meaning if we're in idle state
    if (animationState !== 'idle') return;

    // Show meaning overlay
    setShowMeaning(true);

    // Auto-hide after a delay
    const meaningDisplayTime = 2000; // 2 seconds

    meaningTimeoutRef.current = setTimeout(() => {
      setShowMeaning(false);
    }, meaningDisplayTime);
  }, [animationState]);

  // Handle success button press
  const handleSuccessPress = useCallback(() => {
    // Only allow interaction in idle state
    if (animationState !== 'idle') return;

    // Call the word update function with success=true
    handleWordUpdate(true);
  }, [handleWordUpdate, animationState]);

  // Handle failure button press
  const handleFailurePress = useCallback(() => {
    // Only allow interaction in idle state
    if (animationState !== 'idle') return;

    // Call the word update function with success=false
    handleWordUpdate(false);
  }, [handleWordUpdate, animationState]);

  // Create pan gesture for swipe interactions
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      // Only allow gesture in idle state
      if (animationState !== 'idle') return;

      // Update the translateX value based on the gesture
      translateX.value = e.translationX;
    })
    .onEnd(e => {
      // Only process gesture in idle state
      if (animationState !== 'idle') return;

      // Determine if the swipe was far enough to trigger an action
      if (e.translationX > SWIPE_THRESHOLD) {
        // Swipe right - success
        translateX.value = withSpring(SCREEN_WIDTH, ANIMATION_CONFIG, () => {
          runOnJS(handleWordUpdate)(true);
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - failure
        translateX.value = withSpring(-SCREEN_WIDTH, ANIMATION_CONFIG, () => {
          runOnJS(handleWordUpdate)(false);
        });
      } else {
        // Not far enough, return to center
        translateX.value = withSpring(0, ANIMATION_CONFIG);
      }
    });

  // Create animated styles for the card
  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  // Update current sentence when next sentence changes and we're in the right state
  useEffect(() => {
    if (animationState === 'updating-word' && nextSentence) {
      setCurrentSentence(nextSentence);
    }
  }, [animationState, nextSentence]);

  // Handle completion
  useEffect(() => {
    if (isComplete) {
      // Show completion modal
      setShowCompletionModal(true);

      // Hide modal after a delay
      setTimeout(() => {
        setShowCompletionModal(false);
        // Navigate back to vocabulary screen
        router.replace('/(tabs)/vocabulary');
      }, 2000);
    }
  }, [isComplete, router]);

  // If loading, show loader
  if (isLoading || !currentWord) {
    return (
      <ThemedView style={baseStyles.container}>
        <Loader size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={baseStyles.container}>
      {/* Progress bar */}
      <View style={baseStyles.progressContainer}>
        <ProgressBar progress={progress} />
      </View>

      {/* Main content */}
      <GestureHandlerRootView style={baseStyles.gestureRoot}>
        <GestureDetector gesture={panGesture}>
          <View style={baseStyles.contentContainer}>
            {/* Word card */}
            <Animated.View style={[baseStyles.sentenceContainer, cardStyle]}>
              {currentSentence && (
                <>
                  {/* Sentence with highlighted word */}
                  <View style={baseStyles.sentenceTextContainer}>
                    <ThemedText
                      style={[baseStyles.sentenceText, getArabicTextStyle(BASE_FONT_SIZE * 1.5)]}
                    >
                      {currentSentence.beforeWord}
                      <ThemedText
                        style={[
                          baseStyles.sentenceText,
                          baseStyles.highlightedWord,
                          getArabicTextStyle(BASE_FONT_SIZE * 1.5),
                          { color: colors.tint },
                        ]}
                      >
                        {currentSentence.wordForm}
                      </ThemedText>
                      {currentSentence.afterWord}
                    </ThemedText>
                  </View>

                  {/* Meaning overlay */}
                  {showMeaning && (
                    <Animated.View
                      style={baseStyles.meaningOverlay}
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(200)}
                    >
                      <ThemedText style={[baseStyles.meaningText, { color: colors.tint }]}>
                        {currentWord.sentence_word.english}
                      </ThemedText>
                    </Animated.View>
                  )}
                </>
              )}
            </Animated.View>

            {/* Action buttons */}
            <View style={baseStyles.actionsContainer}>
              {/* Failure button */}
              <Pressable
                style={({ pressed }) => [
                  baseStyles.actionButton,
                  {
                    backgroundColor: pressed ? '#ff000030' : isDarkMode ? '#ff000020' : '#ff000010',
                    borderColor: '#ff000030',
                  },
                ]}
                onPress={handleFailurePress}
                disabled={animationState !== 'idle'}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#ff0000"
                  style={{ opacity: animationState !== 'idle' ? 0.5 : 1 }}
                />
              </Pressable>

              {/* Show meaning button */}
              <Pressable
                style={({ pressed }) => [
                  baseStyles.actionButton,
                  {
                    backgroundColor: pressed
                      ? colors.text + '20'
                      : isDarkMode
                        ? colors.text + '15'
                        : colors.text + '08',
                    borderColor: colors.text + '20',
                  },
                ]}
                onPress={handleShowMeaning}
                disabled={animationState !== 'idle' || showMeaning}
              >
                <Ionicons
                  name="eye"
                  size={24}
                  color={colors.text}
                  style={{ opacity: animationState !== 'idle' || showMeaning ? 0.5 : 0.8 }}
                />
              </Pressable>

              {/* Success button */}
              <Pressable
                style={({ pressed }) => [
                  baseStyles.actionButton,
                  {
                    backgroundColor: pressed ? '#00cc0030' : isDarkMode ? '#00cc0020' : '#00cc0010',
                    borderColor: '#00cc0030',
                  },
                ]}
                onPress={handleSuccessPress}
                disabled={animationState !== 'idle'}
              >
                <Ionicons
                  name="checkmark"
                  size={24}
                  color="#00cc00"
                  style={{ opacity: animationState !== 'idle' ? 0.5 : 1 }}
                />
              </Pressable>
            </View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Completion modal */}
      <ThemedModal
        visible={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        title="Review Complete!"
        contentStyle={{}}
      >
        <View style={baseStyles.completionContainer}>
          <Ionicons
            name="checkmark-circle"
            size={64}
            color="#00cc00"
            style={baseStyles.completionIcon}
          />
          <ThemedText style={baseStyles.completionText}>
            Great job! You've completed your review session.
          </ThemedText>
        </View>
      </ThemedModal>

      {/* Back button */}
      <Pressable
        style={({ pressed }) => [
          baseStyles.backButton,
          {
            backgroundColor: pressed
              ? colors.text + '15'
              : isDarkMode
                ? colors.text + '10'
                : colors.text + '05',
          },
        ]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
    </ThemedView>
  );
}
