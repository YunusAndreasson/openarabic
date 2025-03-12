import React, { useMemo } from 'react';
import { StyleSheet, Dimensions, View, TextStyle, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import Animated from 'react-native-reanimated';
import { StudyWord } from '../types/vocabulary.types';
import { useFadeInAnimation, useSlideAnimation, useLayoutAnimation } from '@/hooks/animations';

// Define transition types
export type TransitionType = 'fade' | 'slide';

interface WordReviewCardProps {
  word?: StudyWord;
  transitionType?: TransitionType;
  isVisible: boolean;
}

/**
 * A card component for displaying a word during review
 *
 * This component uses Reanimated 3's built-in animations for optimal performance.
 */
export function WordReviewCard({ word, transitionType = 'fade', isVisible }: WordReviewCardProps) {
  const colors = useColors();

  // Get animations from hooks
  const { entering: fadeEntering } = useFadeInAnimation(0, 300);
  const { entering: slideEntering } = useSlideAnimation();

  // Use the layout animation hook with LinearTransition
  const { layout } = useLayoutAnimation({
    type: 'linear',
    duration: 300,
  });

  // Determine which animation to use
  const entering = useMemo(() => {
    if (!isVisible) return undefined;
    return transitionType === 'fade' ? fadeEntering : slideEntering;
  }, [transitionType, fadeEntering, slideEntering, isVisible]);

  // Themed styles
  const themedStyles = useMemo(
    () => ({
      cardBackground: {
        backgroundColor: colors.cardBackground,
      },
      arabicText: {
        color: colors.text,
      },
      englishText: {
        color: colors.text,
      },
    }),
    [colors]
  );

  if (!word) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        themedStyles.cardBackground,
        {
          borderColor: colors.cardBorder,
        } as ViewStyle,
      ]}
      entering={entering}
      layout={layout}
    >
      <View style={styles.contentContainer}>
        <View style={styles.wordContainer}>
          <Animated.Text
            style={[
              styles.arabicWord,
              {
                ...getArabicTextStyle(24),
                color: colors.text,
              } as TextStyle,
            ]}
          >
            {word.sentence_word?.word_form || ''}
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

// Define styles
const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    margin: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    minHeight: 200,
    ...LAYOUT.SHADOW.MEDIUM,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicWord: {
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  englishWord: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  sentenceContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    borderTopWidth: 1,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    alignItems: 'flex-end',
  },
  sentenceLabel: {
    marginBottom: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  sentenceText: {
    width: '100%',
    paddingVertical: LAYOUT.SPACING.TINY,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
});

WordReviewCard.displayName = 'WordReviewCard';
