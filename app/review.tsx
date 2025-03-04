import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
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
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15;

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
  },
  sentence: {
    textAlign: 'center',
    fontSize: BASE_FONT_SIZE * 1.5,
    lineHeight: Math.round(BASE_FONT_SIZE * 1.5 * 2.2),
    fontFamily: 'NotoNaskhArabic',
  },
  studyWord: {
    fontWeight: '600',
    fontSize: BASE_FONT_SIZE * 1.75,
    lineHeight: Math.round(BASE_FONT_SIZE * 1.75 * 2.2),
  },
  dimmedText: {
    fontWeight: '400',
    fontSize: BASE_FONT_SIZE * 1.5,
    lineHeight: Math.round(BASE_FONT_SIZE * 1.5 * 2.2),
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
  },
  meaningText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
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
  modalIcon: {
    marginRight: LAYOUT.SPACING.MEDIUM,
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
});

export default function ReviewScreen() {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const { user } = useAuth();
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const { currentWord, isLoading, updateWord, progress, isComplete, invalidateQueries, dueWords } =
    useSpacedRepetition({
      userId: user?.id,
    });

  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Handle word update (success or failure)
  const handleWordUpdate = useCallback(
    (success: boolean) => {
      // Provide haptic feedback
      Haptics.impactAsync(
        success ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      );

      // If the user doesn't know the word, show the meaning
      if (!success) {
        setShowMeaningOverlay(true);
        // Hide the meaning after a delay
        setTimeout(() => {
          setShowMeaningOverlay(false);
          // Update the word status after showing the meaning
          if (currentWord?.sentence_word_id) {
            // First update the word in the database
            updateWord(currentWord.sentence_word_id, success);
            // Then handle animations - faster timing
            setTimeout(() => {
              // Reset position and fade in the new word
              translateX.value = 0;
              opacity.value = 0;
              setTimeout(() => {
                opacity.value = withTiming(1, { duration: 150 }); // Faster fade-in
              }, 20); // Shorter delay
            }, 50); // Shorter delay
          }
        }, 1500); // Shorter meaning display time
      } else {
        // Update the word status immediately for success
        if (currentWord?.sentence_word_id) {
          // First update the word in the database
          updateWord(currentWord.sentence_word_id, success);
          // Then handle animations - faster timing
          setTimeout(() => {
            // Reset position and fade in the new word
            translateX.value = 0;
            opacity.value = 0;
            setTimeout(() => {
              opacity.value = withTiming(1, { duration: 150 }); // Faster fade-in
            }, 20); // Shorter delay
          }, 50); // Shorter delay
        }
      }
    },
    [currentWord, updateWord, opacity, translateX]
  );

  // Create a pan gesture handler for the entire screen
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(0) // Activate immediately
    .minDistance(5) // Reduce minimum distance to detect swipe
    .onUpdate(event => {
      // Update the horizontal position based on the gesture
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - success
        translateX.value = withSpring(SCREEN_WIDTH, { damping: 20, stiffness: 200 }, () => {
          // Faster spring
          runOnJS(handleWordUpdate)(true);
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - failure
        translateX.value = withSpring(-SCREEN_WIDTH, { damping: 20, stiffness: 200 }, () => {
          // Faster spring
          runOnJS(handleWordUpdate)(false);
        });
      } else {
        // Return to center if not swiped far enough
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 }); // Faster spring
      }
    });

  // Log when current word changes to help debug
  useEffect(() => {
    if (currentWord) {
      // Reset opacity to 1 when word changes
      opacity.value = 1;
    }
  }, [currentWord, opacity]);

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

  // Prepare the word parts for display
  const getWordParts = useCallback(() => {
    if (!currentWord) return { beforeWord: '', wordForm: '', afterWord: '' };

    const sentence = currentWord.sentence_word.sentence?.arabic || '';
    const wordForm = currentWord.sentence_word.word_form;
    const wordIndex = sentence.indexOf(wordForm);
    const beforeWord = wordIndex > 0 ? sentence.substring(0, wordIndex) : '';
    const afterWord = wordIndex >= 0 ? sentence.substring(wordIndex + wordForm.length) : sentence;

    return { beforeWord, wordForm, afterWord };
  }, [currentWord]);

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
      },
    }),
    [colors]
  );

  // Create animated styles
  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  // Render loading state
  if (isLoading) {
    return (
      <ThemedView style={baseStyles.container}>
        <Loader size="large" />
      </ThemedView>
    );
  }

  // Render error state
  if (!currentWord?.sentence_word?.word_form && !isLoading && dueWords.length > 0) {
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
          <ThemedText style={baseStyles.completionText}>
            You've completed all your reviews for now!
          </ThemedText>
          <ThemedButton title="Back to Home" onPress={handleClose} />
        </View>
      </ThemedView>
    );
  }

  // Extract word parts for display
  const { beforeWord, wordForm, afterWord } = getWordParts();

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
              <Animated.View style={cardStyle}>
                <ThemedText style={baseStyles.sentence} skipDefaultColor>
                  <ThemedText
                    style={[baseStyles.dimmedText, { color: colors.englishText }]}
                    skipDefaultColor
                  >
                    {beforeWord}
                  </ThemedText>
                  <ThemedText
                    style={[baseStyles.studyWord, { color: colors.tint }]}
                    skipDefaultColor
                  >
                    {wordForm}
                  </ThemedText>
                  <ThemedText
                    style={[baseStyles.dimmedText, { color: colors.englishText }]}
                    skipDefaultColor
                  >
                    {afterWord}
                  </ThemedText>
                </ThemedText>
              </Animated.View>
            </View>
          </GestureDetector>

          {showMeaningOverlay && (
            <View style={baseStyles.meaningOverlay}>
              <ThemedText style={baseStyles.meaningText}>
                {currentWord?.sentence_word?.english || 'No translation available'}
              </ThemedText>
            </View>
          )}

          <View style={baseStyles.footer}>
            <Pressable
              onPress={handleClose}
              style={[baseStyles.actionButton, { backgroundColor: colors.cardBackground }]}
            >
              <Ionicons name="close" size={28} color={colors.englishText} />
            </Pressable>
            <Pressable
              onPress={handleInfoPress}
              style={[baseStyles.actionButton, { backgroundColor: colors.cardBackground }]}
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
            <View style={[baseStyles.modalInstructionRow, { marginBottom: LAYOUT.SPACING.MEDIUM }]}>
              <View style={colorStyles.modalIconContainer}>
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={colors.tint}
                  style={baseStyles.modalIcon}
                />
              </View>
              <ThemedText style={baseStyles.modalText}>
                Swipe left if you don't know the word
              </ThemedText>
            </View>
            <View style={baseStyles.modalInstructionRow}>
              <View style={colorStyles.modalIconContainer}>
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color={colors.tint}
                  style={baseStyles.modalIcon}
                />
              </View>
              <ThemedText style={baseStyles.modalText}>Swipe right if you know the word</ThemedText>
            </View>
          </View>
        </ThemedModal>
      </GestureHandlerRootView>
    </ThemedView>
  );
}
