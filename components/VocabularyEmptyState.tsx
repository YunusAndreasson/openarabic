import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { router } from 'expo-router';
import { VocabularyEmptyStateProps } from '@/types/ui/layout.types';
import { withOpacity } from '@/utils/colorUtils';
import { ThemedText } from './ThemedText';
import EmptyState from './EmptyState';

export const VocabularyEmptyState = React.memo(({ colors }: VocabularyEmptyStateProps) => {
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
      icon="book-outline"
      colors={colors}
      iconSize={48}
      customActionButton={customActionButton}
    />
  );
});

const styles = StyleSheet.create({
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    gap: LAYOUT.SPACING.SMALL,
  },
});

VocabularyEmptyState.displayName = 'VocabularyEmptyState';
