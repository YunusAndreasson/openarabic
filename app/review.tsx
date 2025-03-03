import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable, Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SCREEN_WIDTH, LAYOUT } from '@/constants/layout';
import { ThemedButton } from '@/components/ThemedButton';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedModal } from '@/components/ThemedModal';
import { Loader } from '@/components/Loader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

// Constants
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15;
const SWIPE_OUT_DURATION = LAYOUT.ANIMATION.DURATION.FAST;
const MEANING_DISPLAY_DURATION = 1600;
const INITIAL_FADE_DURATION = 150;

// Main Component
export default function ReviewScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const mountedRef = useRef(true);

  // Replace Animated.ValueXY with Reanimated shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const fadeOpacity = useSharedValue(1);
  const screenFadeOpacity = useSharedValue(0.5);

  const meaningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isScreenReady, setIsScreenReady] = useState(true);

  // Optimize fade-in animation with Reanimated
  useEffect(() => {
    // Start animation immediately with better performance values
    screenFadeOpacity.value = withTiming(1, { duration: INITIAL_FADE_DURATION });
  }, []);

  // Use the spaced repetition hook
  const {
    currentIndex,
    currentWord,
    isLoading,
    isUpdating,
    updateWord,
    progress,
    isComplete,
    invalidateQueries,
    transitionType,
    dueWords,
  } = useSpacedRepetition({
    userId: user?.id,
    onComplete: () => {
      // Additional completion logic if needed
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Set mounted ref to false to prevent state updates after unmount
      mountedRef.current = false;

      // Clear any pending timeouts
      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = null;
      }
    };
  }, []);

  // Function to check if interaction should be disabled
  const isInteractionDisabled = useCallback(() => {
    return Boolean(isAnimating || isLoading || !currentWord);
  }, [isAnimating, isLoading, currentWord]);

  // Handle swipe with Reanimated
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      // Check if we should allow interaction
      if (isAnimating || isLoading || !currentWord || !currentWord.sentence_word_id) {
        return;
      }

      setIsAnimating(true);

      if (direction === 'right') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Animate card off screen to the right
        translateX.value = withTiming(SCREEN_WIDTH, { duration: SWIPE_OUT_DURATION });

        // Use a timeout instead of callback for animation completion
        setTimeout(() => {
          updateWord(currentWord.sentence_word_id, true);
          setIsAnimating(false);
        }, SWIPE_OUT_DURATION + 50);
      } else if (direction === 'left') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // Animate card off screen to the left
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: SWIPE_OUT_DURATION });

        // Use a timeout instead of callback for animation completion
        setTimeout(() => {
          setShowMeaningOverlay(true);
          meaningTimeoutRef.current = setTimeout(() => {
            setShowMeaningOverlay(false);
            translateX.value = -SCREEN_WIDTH;
            updateWord(currentWord.sentence_word_id, false);
            setIsAnimating(false);
          }, MEANING_DISPLAY_DURATION);
        }, SWIPE_OUT_DURATION + 50);
      }
    },
    [currentWord, isAnimating, isLoading, updateWord]
  );

  // Gesture handler for pan gestures
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      // We don't need to check anything on start
    },
    onActive: event => {
      // Only handle horizontal gestures if not disabled
      if (
        Math.abs(event.translationX) > Math.abs(event.translationY) &&
        Math.abs(event.translationX) > 10
      ) {
        translateX.value = event.translationX;
      }
    },
    onEnd: event => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleSwipe)('right');
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleSwipe)('left');
      } else {
        // Return to center if not swiped far enough
        translateX.value = withSpring(0);
        runOnJS(setIsAnimating)(false);
      }
    },
  });

  // Animated styles for the card
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
      opacity: fadeOpacity.value,
    };
  });

  // Animated style for screen fade
  const screenAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: screenFadeOpacity.value,
    };
  });

  // UI handlers
  const handleClose = useCallback(() => {
    // Invalidate the study words query to ensure vocabulary screen gets fresh data
    invalidateQueries();

    // Clear any pending timeouts
    if (meaningTimeoutRef.current) {
      clearTimeout(meaningTimeoutRef.current);
      meaningTimeoutRef.current = null;
    }

    // Fade out the screen
    screenFadeOpacity.value = withTiming(0, { duration: INITIAL_FADE_DURATION });

    // Use a timeout instead of callback
    setTimeout(() => {
      router.back();
    }, INITIAL_FADE_DURATION + 50);
  }, [invalidateQueries]);

  const [showInstructions, setShowInstructions] = useState(false);

  // Current word data - memoized to prevent recalculations
  const currentWordData = useCallback(() => {
    const word = currentWord?.sentence_word;
    const wordForm = word?.word_form;
    const sentence = word?.sentence?.arabic;
    const parts = sentence && wordForm ? sentence.split(wordForm) : ['', ''];

    return { word, wordForm, sentence, parts };
  }, [currentWord]);

  const { wordForm, sentence, parts } = currentWordData();

  // Ensure meaning timeout is cleared when component unmounts or when overlay is hidden
  useEffect(() => {
    if (!showMeaningOverlay && meaningTimeoutRef.current) {
      clearTimeout(meaningTimeoutRef.current);
      meaningTimeoutRef.current = null;
    }
  }, [showMeaningOverlay]);

  // Reset animation when current index changes
  useEffect(() => {
    // Reset animation values
    translateX.value = 0;
    translateY.value = 0;

    if (transitionType === 'fade') {
      // For fade transition
      fadeOpacity.value = 0;
      fadeOpacity.value = withTiming(1, { duration: 250 });
    } else {
      // For slide transition
      translateX.value = SCREEN_WIDTH;
      translateX.value = withSpring(0, {
        damping: 7,
        stiffness: 65,
      });
    }
  }, [currentIndex, translateX, translateY, fadeOpacity, transitionType]);

  // Memoize the progress bar style for better performance
  const progressBarStyle = useMemo(
    () => ({
      height: LAYOUT.SPACING.SMALL,
      borderRadius: LAYOUT.SPACING.SMALL / 2,
      marginBottom: LAYOUT.SPACING.LARGE,
      width: '100%' as any,
      marginTop: isLoading || isComplete || !currentWord ? 0 : LAYOUT.SPACING.XLARGE,
    }),
    [isLoading, isComplete, currentWord]
  );

  // Render the main content
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loaderContainer}>
          <Loader size="large" />
        </View>
      );
    }

    if (!currentWord) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            {isUpdating
              ? 'Error loading words. Please try again.'
              : 'No words to review at this time.'}
          </ThemedText>
          <ThemedButton title="Return to Vocabulary" onPress={handleClose} style={styles.button} />
        </View>
      );
    }

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <ProgressBar progress={progress} style={progressBarStyle} fillColor={colors.tint} />

          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
              <ThemedText style={styles.sentence} skipDefaultColor>
                <ThemedText
                  style={[styles.dimmedText, { color: `${colors.text}70` }]}
                  skipDefaultColor
                >
                  {parts[0]}
                </ThemedText>
                <ThemedText
                  style={[styles.highlightedText, { color: colors.arabicText }]}
                  skipDefaultColor
                >
                  {wordForm}
                </ThemedText>
                <ThemedText
                  style={[styles.dimmedText, { color: `${colors.text}70` }]}
                  skipDefaultColor
                >
                  {parts[1]}
                </ThemedText>
              </ThemedText>
            </Animated.View>
          </PanGestureHandler>

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
              onPress={() => {
                if (isAnimating || isLoading || !currentWord) return;
                handleSwipe('left');
              }}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => {
                if (isAnimating || isLoading || !currentWord) return;
                handleSwipe('right');
              }}
            >
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'none',
          presentation: 'containedModal',
          gestureEnabled: false,
        }}
      />
      <Animated.View style={screenAnimatedStyle}>{renderContent()}</Animated.View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: LAYOUT.SCREEN_EDGE_PADDING,
  },
  sentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
    textAlign: 'center',
    fontFamily: 'NotoNaskhArabic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.8,
  },
  dimmedText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
    fontFamily: 'NotoNaskhArabic',
  },
  highlightedText: {
    fontWeight: 'bold',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
    fontFamily: 'NotoNaskhArabic',
  },
  meaningOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  meaningText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.1,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: LAYOUT.SPACING.LARGE,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.SHADOW.SMALL,
  },
  modalInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  modalText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  button: {
    minWidth: 120,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
  },
});

// Add display name
ReviewScreen.displayName = 'ReviewScreen';
