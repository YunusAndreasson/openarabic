import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, memo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import type { VocabularyEmptyStateProps } from '@/types/ui/layout.types';
import { withOpacity } from '@/utils/colorUtils';

import EmptyState from '../EmptyState';
import { ThemedText } from '../ThemedText';

export const VocabularyEmptyState = memo(({ colors }: VocabularyEmptyStateProps) => {
  const handleBrowseArticles = useCallback(() => {
    router.push('/(tabs)');
  }, []);

  const customActionButton = (
    <TouchableOpacity
      style={[styles.emptyActionButton, { backgroundColor: withOpacity(colors.text, 0.1) }]}
      onPress={handleBrowseArticles}
      accessibilityLabel="Go to articles to build words"
      accessibilityRole="button"
    >
      <ThemedText type="bodyBold">Articles</ThemedText>
      <Ionicons name="arrow-forward" size={16} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <EmptyState
      title="Begin Words Journey"
      description="No saved words"
      submessage="Tap words while reading to add to your study list"
      iconType="name"
      icon="book-outline"
      colors={colors}
      iconSize={48}
      customActionButton={customActionButton}
    />
  );
});

const styles = StyleSheet.create({
  emptyActionButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
});

VocabularyEmptyState.displayName = 'VocabularyEmptyState';
