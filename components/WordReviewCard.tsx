import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LAYOUT } from '../constants/layout';
import { WordReviewCardProps } from '@/types/ui/layout.types';
import BaseCard from './BaseCard';
import { ThemedText } from './ThemedText';

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
  card: {
    margin: LAYOUT.SPACING.MEDIUM,
    minHeight: 200,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicWordContainer: {
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

WordReviewCard.displayName = 'WordReviewCard';
