import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions, View, TextStyle, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import Animated from 'react-native-reanimated';
import { StudyWord } from '../types/vocabulary.types';
import { useFadeInAnimation } from '@/hooks/animations';
import { useSlideAnimation } from '../hooks/animations/useSlideAnimation';

// Define transition types
export type TransitionType = 'fade' | 'slide';

interface WordReviewCardProps {
  word?: StudyWord;
  transitionType?: TransitionType;
  isVisible: boolean;
}

/**
 * A card component for displaying a word during review
 */
export function WordReviewCard({ word, transitionType = 'fade', isVisible }: WordReviewCardProps) {
  const colors = useColors();

  // Use appropriate animation based on transition type
  const { animatedStyle: fadeAnimatedStyle, startAnimation: startFadeAnimation } =
    useFadeInAnimation(0, 300);
  const { animatedStyle: slideAnimatedStyle } = useSlideAnimation();

  // Combine animations
  const containerAnimatedStyle = useMemo(() => {
    if (transitionType === 'fade') {
      return fadeAnimatedStyle;
    } else {
      return slideAnimatedStyle;
    }
  }, [transitionType, fadeAnimatedStyle, slideAnimatedStyle]);

  // Start animations when component becomes visible
  useEffect(() => {
    if (isVisible) {
      if (transitionType === 'fade') {
        startFadeAnimation();
      }
    }
  }, [isVisible, transitionType, startFadeAnimation]);

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
        containerAnimatedStyle,
      ]}
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
