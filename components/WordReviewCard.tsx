import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInRight,
  Layout,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { StudyWord } from '../types/vocabulary.types';

// Define transition types
export type TransitionType = 'fade' | 'slide';

interface WordReviewCardProps {
  word?: StudyWord;
  transitionType?: TransitionType;
  isVisible: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WordReviewCard = React.memo(
  ({ word, transitionType = 'fade', isVisible }: WordReviewCardProps) => {
    const colors = useColors();

    // Animation values using Reanimated shared values
    const fadeOpacity = useSharedValue(0);
    const slidePosition = useSharedValue(SCREEN_WIDTH);

    // Create animated styles using Reanimated
    const animatedStyle = useAnimatedStyle(() => {
      if (transitionType === 'fade') {
        return {
          opacity: fadeOpacity.value,
        };
      } else {
        return {
          transform: [{ translateX: slidePosition.value }],
        };
      }
    });

    // Run animation when word changes or becomes visible
    useEffect(() => {
      if (word && isVisible) {
        // Reset animations to initial state
        if (transitionType === 'fade') {
          fadeOpacity.value = 0;
          fadeOpacity.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.cubic), // Smoother easing for fade-in
          });
        } else {
          slidePosition.value = SCREEN_WIDTH;
          slidePosition.value = withSpring(0, {
            damping: 20, // Increased damping for less bouncy behavior
            stiffness: 100, // Increased stiffness for faster movement
            mass: 0.8, // Lower mass for quicker response
            overshootClamping: false,
          });
        }
      } else {
        // Animate out when not visible
        if (transitionType === 'fade') {
          fadeOpacity.value = withTiming(0, { duration: 200 });
        } else {
          slidePosition.value = withTiming(-SCREEN_WIDTH, { duration: 300 });
        }
      }
    }, [word, isVisible, transitionType, fadeOpacity, slidePosition]);

    // Handle case when no word is provided
    if (!word || !word.sentence_word) {
      return null;
    }

    // Determine which entry animation to use
    const getEntryAnimation = () => {
      if (transitionType === 'fade') {
        return FadeIn.duration(300).easing(Easing.out(Easing.cubic));
      } else {
        return SlideInRight.springify().damping(20).stiffness(100).mass(0.8);
      }
    };

    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          },
          // We can remove this since we're using entry animations
          // animatedStyle,
        ]}
        // Add Reanimated layout animations
        entering={getEntryAnimation()}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify().damping(20)}
      >
        <View style={styles.wordContainer}>
          <Animated.Text
            style={[
              styles.arabicWord,
              {
                color: colors.arabicText,
                backgroundColor: `${colors.tint}08`, // Very subtle tint-based background
                borderWidth: 1,
                borderColor: `${colors.tint}15`,
                // Add a subtle shadow for depth
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1, // For Android
              },
            ]}
            entering={FadeIn.delay(150).duration(300)}
          >
            {word.sentence_word.word_form}
          </Animated.Text>

          <Animated.Text style={styles.englishWord} entering={FadeIn.delay(200).duration(300)}>
            {word.sentence_word.english}
          </Animated.Text>

          {word.sentence_word.sentence?.arabic && (
            <Animated.View
              style={styles.sentenceContainer}
              entering={FadeIn.delay(300).duration(400)}
            >
              <ThemedText
                type="arabic"
                arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.LARGE}
                style={{
                  color: `${colors.arabicText}CC`,
                  textAlign: 'right',
                  paddingHorizontal: LAYOUT.SPACING.SMALL,
                }}
                skipDefaultColor
              >
                {word.sentence_word.sentence.arabic}
              </ThemedText>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    );
  }
);

WordReviewCard.displayName = 'WordReviewCard';

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    margin: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    minHeight: 200,
    ...LAYOUT.SHADOW.MEDIUM,
  },
  wordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicWord: {
    ...getArabicTextStyle(42, {
      textAlign: 'center',
      marginBottom: LAYOUT.SPACING.MEDIUM,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 12,
    }),
  },
  englishWord: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  sentenceContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    borderTopWidth: 1,
    borderTopColor: '#00000020',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    alignItems: 'flex-end',
  },
  arabicSentence: {
    ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.LARGE, {
      textAlign: 'right',
      paddingHorizontal: LAYOUT.SPACING.SMALL,
      width: '100%',
    }),
  },
});
