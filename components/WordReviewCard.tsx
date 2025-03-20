import React from 'react';
import { StyleSheet, View, TextStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import Animated from 'react-native-reanimated';
import { WordReviewCardProps } from '@/types/ui.types';
import BaseCard from './BaseCard';

/**
 * A card component for displaying a word during review
 */
export function WordReviewCard({ word, isVisible }: Omit<WordReviewCardProps, 'transitionType'>) {
  const colors = useColors();

  if (!word) return null;

  return (
    <BaseCard style={styles.card} animated={isVisible}>
      <View style={styles.contentContainer}>
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
  arabicWord: {
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

WordReviewCard.displayName = 'WordReviewCard';
