import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import type { StudyWord } from '../hooks/useSpacedRepetition';

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
          fadeOpacity.value = withTiming(1, { duration: 300 });
        } else {
          slidePosition.value = SCREEN_WIDTH;
          slidePosition.value = withSpring(0, {
            damping: 15,
            stiffness: 50,
          });
        }
      }
    }, [word, isVisible, transitionType, fadeOpacity, slidePosition]);

    // Handle case when no word is provided
    if (!word || !word.sentence_word) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.wordContainer}>
          <ThemedText style={[styles.arabicWord, { color: colors.arabicText }]} skipDefaultColor>
            {word.sentence_word.word_form}
          </ThemedText>

          <ThemedText style={styles.englishWord}>{word.sentence_word.english}</ThemedText>

          {word.sentence_word.sentence?.arabic && (
            <View style={styles.sentenceContainer}>
              <ThemedText
                style={[styles.arabicSentence, { color: `${colors.arabicText}CC` }]}
                skipDefaultColor
              >
                {word.sentence_word.sentence.arabic}
              </ThemedText>
            </View>
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
    fontSize: 42,
    textAlign: 'center',
    fontFamily: 'NotoNaskhArabic',
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
  },
  arabicSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'right',
    fontFamily: 'NotoNaskhArabic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.8,
  },
});
