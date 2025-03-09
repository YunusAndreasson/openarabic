import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions, View, TextStyle, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import Animated, { Layout, Easing } from 'react-native-reanimated';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function WordReviewCard({ word, transitionType = 'fade', isVisible }: WordReviewCardProps) {
  const colors = useColors();

  // Use our custom fade animation hook
  const { animatedStyle: fadeAnimatedStyle, startAnimation: startFadeAnimation } =
    useFadeInAnimation(0, 300);

  // Use fade animations
  const { animatedStyle: arabicStyle, startAnimation: startArabicAnimation } = useFadeInAnimation(
    0,
    300
  );

  const { animatedStyle: translationStyle, startAnimation: startTranslationAnimation } =
    useFadeInAnimation(150, 300);

  const { animatedStyle: exampleStyle, startAnimation: startExampleAnimation } = useFadeInAnimation(
    200,
    300
  );

  const { animatedStyle: actionButtonsStyle, startAnimation: startButtonsAnimation } =
    useFadeInAnimation(300, 400);

  // Use our custom slide animation hook
  const { animatedStyle: slideAnimatedStyle, startAnimation: startSlideAnimation } =
    useSlideAnimation(0, 20, 100, 'right');

  // Run animation when word changes or becomes visible
  useEffect(() => {
    if (word && isVisible) {
      // Reset animations to initial state
      if (transitionType === 'fade') {
        startFadeAnimation();
        startArabicAnimation();
        startTranslationAnimation();
        startExampleAnimation();
        startButtonsAnimation();
      } else {
        startSlideAnimation();
      }
    }
  }, [
    word,
    isVisible,
    transitionType,
    startFadeAnimation,
    startArabicAnimation,
    startTranslationAnimation,
    startExampleAnimation,
    startButtonsAnimation,
    startSlideAnimation,
  ]);

  // Apply the appropriate animation style based on transition type
  const containerAnimatedStyle = transitionType === 'fade' ? fadeAnimatedStyle : slideAnimatedStyle;

  // Create styles with the colors
  const themedStyles = useMemo(() => {
    return {
      cardBackground: {
        backgroundColor: colors.cardBackground,
      },
      cardBorder: {
        borderColor: colors.cardBorder,
      },
      arabicText: {
        color: colors.text,
      },
      englishText: {
        color: colors.text,
      },
      textSecondary: {
        color: colors.tabIconDefault || '#888888',
      },
    };
  }, [colors]);

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
      layout={Layout.springify()}
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
              arabicStyle,
            ]}
          >
            {word.sentence_word.word_form}
          </Animated.Text>

          <Animated.Text style={[styles.englishWord, exampleStyle]}>
            {word.sentence_word.english}
          </Animated.Text>
        </View>

        {word.sentence_word.sentence?.arabic && (
          <Animated.View style={[styles.sentenceContainer, actionButtonsStyle]}>
            <ThemedText style={[styles.sentenceLabel, themedStyles.textSecondary]}>
              Example sentence:
            </ThemedText>
            <ThemedText
              style={[
                styles.sentenceText,
                { ...getArabicTextStyle(18), textAlign: 'right' } as TextStyle,
              ]}
            >
              {word.sentence_word.sentence.arabic}
            </ThemedText>
          </Animated.View>
        )}
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
