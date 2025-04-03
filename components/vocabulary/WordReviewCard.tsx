import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LAYOUT } from '../../constants/layout';
import { WordReviewCardProps } from '@/types/ui/layout.types';
import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

/**
 * A card component for displaying a word during review
 */
export function WordReviewCard({ word }: Omit<WordReviewCardProps, 'transitionType'>) {
  if (!word) return null;

  return (
    <BaseCard style={styles.card}>
      <View style={styles.contentContainer}>
        <View style={styles.arabicWordContainer}>
          <ThemedText type="arabic" arabicFontSize={24}>
            {word.sentence_word?.word_form || ''}
          </ThemedText>
        </View>
      </View>
    </BaseCard>
  );
}

// Define styles
const styles = StyleSheet.create({
  arabicWordContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  card: {
    margin: LAYOUT.SPACING.MEDIUM,
    minHeight: 200,
  },
  contentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});

WordReviewCard.displayName = 'WordReviewCard';
