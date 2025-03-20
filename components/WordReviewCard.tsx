import React, { useMemo } from 'react';
import { StyleSheet, View, TextStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import Animated from 'react-native-reanimated';
import { WordReviewCardProps, TransitionType } from '@/types/ui.types';
import BaseCard from './BaseCard';

/**
 * A card component for displaying a word during review
 *
 * This component uses Reanimated 3's built-in animations for optimal performance.
 */
export function WordReviewCard({ word, transitionType = 'fade', isVisible }: WordReviewCardProps) {
  const colors = useColors();

  if (!word) return null;

  return (
    <BaseCard style={styles.card} animated={isVisible}>
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
    </BaseCard>
  );
}

// Define styles
const styles = StyleSheet.create({
  card: {
    margin: LAYOUT.SPACING.MEDIUM,
    minHeight: 200,
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
