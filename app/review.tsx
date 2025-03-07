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
import { SCREEN_WIDTH, LAYOUT } from '@/constants/layout';
import { ThemedButton } from '@/components/ThemedButton';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedModal } from '@/components/ThemedModal';
import { Loader } from '@/components/Loader';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

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
  },
  sentence: {
    textAlign: 'right',
    fontSize: BASE_FONT_SIZE * 1.5,
    lineHeight: Math.round(BASE_FONT_SIZE * 1.5 * 2.5),
    fontFamily: 'NotoNaskhArabic',
    writingDirection: 'rtl',
    includeFontPadding: false,
    padding: 0,
    margin: 0,
  },
  studyWord: {
    fontWeight: '700',
    fontSize: BASE_FONT_SIZE * 1.5,
    lineHeight: Math.round(BASE_FONT_SIZE * 1.5 * 2.5),
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  dimmedText: {
    fontWeight: '400',
    fontSize: BASE_FONT_SIZE * 1.5,
    lineHeight: Math.round(BASE_FONT_SIZE * 1.5 * 2.5),
    writingDirection: 'rtl',
    includeFontPadding: false,
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
});

export default function ReviewScreen() {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const { user } = useAuth();
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const meaningTimeoutRef = useRef<NodeJS.Timeout>();
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const fadeInTimeoutRef = useRef<NodeJS.Timeout>();
  const resetTransitionRef = useRef<NodeJS.Timeout>();
  const [currentSentence, setCurrentSentence] = useState({
    beforeWord: '',
    wordForm: '',
    afterWord: '',
  });
  const [nextSentence, setNextSentence] = useState({
    beforeWord: '',
    wordForm: '',
    afterWord: '',
  });
  const [animationState, setAnimationState] = useState<
    'idle' | 'transitioning-out' | 'updating-word' | 'transitioning-in'
  >('idle');
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);

  // Track if this is the first render
  const isFirstRender = useRef(true);

  console.log('[DEBUG] Initial render - animationState:', animationState);

  const {
    currentWord,
    isLoading,
    updateWord,
    progress,
    isComplete,
    invalidateQueries,
    dueWords,
    currentIndex,
  } = useSpacedRepetition({
    userId: user?.id,
  });

  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Use useAnimatedReaction to safely track opacity value changes
  // This avoids the warning about reading shared values during render
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
      console.log('[DEBUG] currentWord changed:', currentWord.sentence_word_id);

      const sentence = currentWord.sentence_word.sentence?.arabic || '';
      const wordForm = currentWord.sentence_word.word_form;

      // For RTL languages like Arabic, we need special handling
      // to ensure proper word placement in the sentence
      const wordIndex = sentence.indexOf(wordForm);
      console.log('[DEBUG] Word index in sentence:', wordIndex, 'Word:', wordForm);

      // In RTL, the "before" actually comes after the word visually
      // and "after" comes before the word visually
      const beforeWord = wordIndex >= 0 ? sentence.substring(wordIndex + wordForm.length) : '';
      const afterWord = wordIndex > 0 ? sentence.substring(0, wordIndex) : '';

      console.log(
        '[DEBUG] Setting nextSentence - beforeWord:',
        beforeWord.length,
        'wordForm:',
        wordForm,
        'afterWord:',
        afterWord.length
      );

      // Store the next sentence for animation
      const newSentence = { beforeWord, wordForm, afterWord };
      setNextSentence(newSentence);

      // Only set currentSentence immediately on first load
      if (isFirstRender.current) {
        console.log('[DEBUG] Setting currentSentence immediately - first render');
        setCurrentSentence(newSentence);
        isFirstRender.current = false;
      }
    }
  }, [currentWord]);

  // Handle word update (success or failure)
  const handleWordUpdate = useCallback(
    (success: boolean) => {
      console.log('[DEBUG] handleWordUpdate called - success:', success);

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
        console.log('[DEBUG] updateWordAndAnimate called');

        if (currentWord?.sentence_word_id) {
          try {
            // Update animation state to reflect that we're transitioning out
            console.log('[DEBUG] Setting animationState to transitioning-out');
            setAnimationState('transitioning-out');

            // First update the word in the database
            console.log('[DEBUG] Calling updateWord with ID:', currentWord.sentence_word_id);
            updateWord(currentWord.sentence_word_id, success);

            // Reset position immediately
            translateX.value = 0;
            console.log('[DEBUG] Reset translateX to 0');

            // Set opacity to 0 immediately
            opacity.value = 0;
            console.log('[DEBUG] Set opacity to 0');

            // Move to next state - we're now updating the word
            console.log('[DEBUG] Setting animationState to updating-word');
            setAnimationState('updating-word');

            // OPTIMIZATION: Reduce animation delays to show next word faster
            // For "knew the word" (success), use an even quicker transition
            const animationDelay = success ? 0 : 10; // Reduced from 10/30
            const animationDuration = success ? FADE_DURATION : 100; // Reduced from 150
            console.log('[DEBUG] Animation delay:', animationDelay, 'duration:', animationDuration);

            // Use a small delay to ensure the new word is loaded before fading in
            // Store the timeout reference for cleanup
            console.log('[DEBUG] Setting fadeInTimeoutRef with delay:', animationDelay);

            // OPTIMIZATION: For success case, skip the timeout completely
            if (success) {
              // Update state to transitioning in immediately
              console.log('[DEBUG] Success case - transitioning in immediately');
              setAnimationState('transitioning-in');

              // Fade in immediately without any delay
              console.log(
                '[DEBUG] Starting opacity animation to 1 with duration:',
                animationDuration
              );
              opacity.value = withTiming(1, { duration: animationDuration }, () => {
                // Use the animation completion callback to safely reset the state
                console.log('[DEBUG] Opacity animation complete, setting animationState to idle');
                runOnJS(setAnimationState)('idle');
              });
            } else {
              // For failure case, still use a small delay
              fadeInTimeoutRef.current = setTimeout(() => {
                // Clear the reference once executed
                fadeInTimeoutRef.current = undefined;
                console.log('[DEBUG] Inside fadeInTimeout callback');

                // Update state to transitioning in
                console.log('[DEBUG] Setting animationState to transitioning-in');
                setAnimationState('transitioning-in');

                // Fade in immediately without additional delay
                console.log(
                  '[DEBUG] Starting opacity animation to 1 with duration:',
                  animationDuration
                );
                opacity.value = withTiming(1, { duration: animationDuration }, () => {
                  // Use the animation completion callback to safely reset the state
                  console.log('[DEBUG] Opacity animation complete, setting animationState to idle');
                  runOnJS(setAnimationState)('idle');
                });
              }, animationDelay);
            }
          } catch (error) {
            console.error('[DEBUG] Error updating word:', error);
            // Fallback animation in case of error
            translateX.value = withSpring(0, ANIMATION_CONFIG);
            opacity.value = withTiming(1, { duration: 200 });
            setAnimationState('idle');
          }
        }
      };

      // If the user doesn't know the word, show the meaning
      if (!success) {
        console.log('[DEBUG] Showing meaning overlay');
        // Fade in the meaning overlay
        setShowMeaningOverlay(true);

        // Hide the meaning after a delay
        // OPTIMIZATION: Reduce the meaning display time for faster progression
        const meaningDisplayTime = 1000; // Reduced from 1500ms
        console.log('[DEBUG] Setting meaningTimeoutRef with delay:', meaningDisplayTime, 'ms');
        meaningTimeoutRef.current = setTimeout(() => {
          // Clear the reference once executed
          meaningTimeoutRef.current = undefined;
          console.log('[DEBUG] Inside meaningTimeout callback, hiding meaning overlay');

          setShowMeaningOverlay(false);
          // Update the word status after showing the meaning
          updateWordAndAnimate();
        }, meaningDisplayTime);
      } else {
        console.log('[DEBUG] Success case, calling updateWordAndAnimate immediately');
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
      console.log(
        '[DEBUG] Pan gesture ended - translationX:',
        event.translationX,
        'threshold:',
        SWIPE_THRESHOLD
      );

      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - success
        console.log('[DEBUG] Swipe right detected (success)');
        // OPTIMIZATION: Faster spring animation for success case
        translateX.value = withSpring(SCREEN_WIDTH, { damping: 12, stiffness: 250 }, () => {
          console.log('[DEBUG] Swipe right animation complete, calling handleWordUpdate(true)');
          runOnJS(handleWordUpdate)(true);
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - failure
        console.log('[DEBUG] Swipe left detected (failure)');
        translateX.value = withSpring(-SCREEN_WIDTH, ANIMATION_CONFIG, () => {
          console.log('[DEBUG] Swipe left animation complete, calling handleWordUpdate(false)');
          runOnJS(handleWordUpdate)(false);
        });
      } else {
        // Return to center if not swiped far enough
        console.log('[DEBUG] Swipe not far enough, returning to center');
        translateX.value = withSpring(0, ANIMATION_CONFIG);
      }
    });

  // Handle close button press
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    invalidateQueries();
    router.back();
  }, [invalidateQueries]);

  // Handle retry button press
  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    invalidateQueries();
  }, [invalidateQueries]);

  // Handle info button press
  const handleInfoPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowInstructions(true);
  }, []);

  // Memoize color-dependent styles
  const colorStyles = useMemo(
    () => ({
      cardContainer: {
        backgroundColor: colors.cardBackground,
      },
      modalContent: {
        backgroundColor: colors.cardBackground,
      },
      modalIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.textOverlay,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
      },
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

  // Extract word parts for display - use the state version instead of direct calculation
  const { beforeWord, wordForm, afterWord } = currentSentence;

  // Don't add spaces as they're handled by natural Arabic text flow
  // Arabic spaces are handled differently than English
  const spacedBeforeWord = beforeWord;
  const spacedAfterWord = afterWord;

  // Memoize the sentence content to prevent unnecessary re-renders
  const sentenceContent = useMemo(
    () => (
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
        <ThemedText style={baseStyles.sentence} skipDefaultColor>
          <ThemedText
            style={[baseStyles.dimmedText, { color: colors.englishText, opacity: 0.7 }]}
            skipDefaultColor
          >
            {spacedAfterWord}
          </ThemedText>
          <ThemedText style={{ opacity: 0 }}>{'\u00A0'}</ThemedText>
          <ThemedText
            style={[
              baseStyles.studyWord,
              {
                color: colors.tint,
                backgroundColor: `${colors.tint}15`, // Add faint background color (15% opacity)
                paddingHorizontal: 12, // Add horizontal padding
                paddingVertical: 5, // Add vertical padding
                borderRadius: 5, // Add rounded corners
                marginHorizontal: 8, // Add margin for spacing between words
                borderWidth: 1, // Add a subtle border
                borderColor: `${colors.tint}30`, // Border color with 30% opacity
                // Add a subtle shadow for depth
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 1,
                elevation: 1, // For Android
              },
            ]}
            skipDefaultColor
          >
            {wordForm}
          </ThemedText>
          <ThemedText style={{ opacity: 0 }}>{'\u00A0'}</ThemedText>
          <ThemedText
            style={[
              baseStyles.dimmedText,
              {
                color: colors.englishText,
                opacity: 0.7,
              },
            ]}
            skipDefaultColor
          >
            {spacedBeforeWord}
          </ThemedText>
        </ThemedText>
      </View>
    ),
    [spacedAfterWord, wordForm, spacedBeforeWord, colors.englishText, colors.tint]
  );

  // Check for completion and show animation
  useEffect(() => {
    if (isComplete && !showCompletionAnimation) {
      console.log('[DEBUG] Review complete, showing completion animation');
      setShowCompletionAnimation(true);

      // Hide completion animation after a delay and show the completion screen
      const completionDelay = 1000; // 1 second
      const completionTimer = setTimeout(() => {
        console.log('[DEBUG] Completion animation finished');
        // The isComplete condition in the render function will now show the completion screen
      }, completionDelay);

      return () => clearTimeout(completionTimer);
    }
  }, [isComplete, showCompletionAnimation]);

  // Render loading state
  if (isLoading) {
    return (
      <ThemedView style={baseStyles.container}>
        <Loader size="large" />
        <ThemedText style={{ marginTop: LAYOUT.SPACING.LARGE }}>
          Loading your review words...
        </ThemedText>
      </ThemedView>
    );
  }

  // Render empty state when there are no due words
  if (!isLoading && dueWords.length === 0) {
    return (
      <ThemedView style={baseStyles.container}>
        <View style={baseStyles.completionContainer}>
          <ThemedText style={baseStyles.completionText}>
            You don't have any words due for review right now.
          </ThemedText>
          <ThemedButton title="Back to Home" onPress={handleClose} />
        </View>
      </ThemedView>
    );
  }

  // Render error state
  if (!currentWord?.sentence_word?.word_form && !isLoading && dueWords.length > 0) {
    // IMPORTANT FIX: Don't show error if we're at the end of the review
    // This prevents the error from flashing before showing the completion state
    if (isComplete) {
      return (
        <ThemedView style={baseStyles.container}>
          <View style={baseStyles.completionContainer}>
            <ThemedText style={baseStyles.completionText}>
              You've completed all your reviews for now!
            </ThemedText>
            <ThemedButton title="Back to Home" onPress={handleClose} />
          </View>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={baseStyles.container}>
        <View style={baseStyles.errorContainer}>
          <ThemedText style={baseStyles.errorText}>
            There was an error loading your review words.
          </ThemedText>
          <ThemedButton title="Try Again" onPress={handleRetry} />
        </View>
      </ThemedView>
    );
  }

  // Render completion state
  if (isComplete) {
    return (
      <ThemedView style={baseStyles.container}>
        <View style={baseStyles.completionContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={baseStyles.completionIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={colors.tint} />
          </Animated.View>
          <Animated.View entering={FadeIn.duration(400).delay(200)}>
            <ThemedText style={baseStyles.completionText}>
              You've completed all your reviews for now!
            </ThemedText>
          </Animated.View>
          <Animated.View entering={FadeIn.duration(400).delay(400)}>
            <ThemedButton title="Back to Home" onPress={handleClose} />
          </Animated.View>
        </View>
      </ThemedView>
    );
  }

  console.log('[DEBUG] Current animationState:', animationState);

  return (
    <ThemedView style={baseStyles.container}>
      <GestureHandlerRootView style={baseStyles.gestureRoot}>
        <View style={baseStyles.contentContainer}>
          <View style={baseStyles.header}>
            <View style={baseStyles.progressContainer}>
              <ProgressBar progress={Math.round(progress)} />
            </View>
          </View>

          <GestureDetector gesture={panGesture}>
            <View style={baseStyles.textContainer}>
              <Animated.View
                key={`sentence-${currentWord?.sentence_word_id || 'initial'}`}
                style={[cardStyle, baseStyles.sentenceContainer]}
              >
                {sentenceContent}
              </Animated.View>
            </View>
          </GestureDetector>

          {showMeaningOverlay && (
            <Animated.View
              style={baseStyles.meaningOverlay}
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(150)}
            >
              <ThemedText style={[baseStyles.meaningText, { color: colors.tint }]}>
                {currentWord?.sentence_word?.english || 'No translation available'}
              </ThemedText>
            </Animated.View>
          )}

          <View style={baseStyles.footer}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                baseStyles.actionButton,
                {
                  backgroundColor: colors.cardBackground,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Ionicons name="close" size={28} color={colors.englishText} />
            </Pressable>
            <Pressable
              onPress={handleInfoPress}
              style={({ pressed }) => [
                baseStyles.actionButton,
                {
                  backgroundColor: colors.cardBackground,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={28} color={colors.englishText} />
            </Pressable>
          </View>
        </View>

        <ThemedModal
          visible={showInstructions}
          onClose={() => setShowInstructions(false)}
          title="How to Review"
          animationType="fade"
          useBlur={true}
          blurIntensity={isDarkMode ? 15 : 30}
          contentStyle={baseStyles.modalContent}
          useHaptics={true}
          animationDuration={250}
          showCloseButton={false}
          overlayOpacity={0.15}
        >
          <View style={[baseStyles.modalInnerContent, { backgroundColor: colors.cardBackground }]}>
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
              <ThemedText style={baseStyles.modalText}>Swipe right if you know the word</ThemedText>
            </View>
          </View>
        </ThemedModal>
      </GestureHandlerRootView>
    </ThemedView>
  );
}
