import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { router } from 'expo-router';
import { VocabularyEmptyStateProps } from '@/types/ui/layout.types';

export const VocabularyEmptyState = React.memo(({ colors }: VocabularyEmptyStateProps) => {
  const handleBrowseArticles = useCallback(() => {
    router.push('/(tabs)');
  }, []);

  return (
    <View style={styles.enhancedEmptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.text + '10' }]}>
        <Ionicons
          name="book-outline"
          size={48}
          color={colors.text}
          style={{ opacity: LAYOUT.OPACITY.DIMMED }}
          accessibilityLabel="Empty words list"
        />
      </View>
      <View style={styles.titleContainer}>
        <ThemedText type="heading2" accessibilityRole="header">
          Begin Words Journey
        </ThemedText>
      </View>
      <View style={styles.messageContainer}>
        <ThemedText type="bodyBold" variant="secondary">
          No saved words
        </ThemedText>
      </View>
      <View style={styles.submessageContainer}>
        <ThemedText type="body" variant="subtle">
          Tap words while reading to add to your study list
        </ThemedText>
      </View>
      <TouchableOpacity
        style={[styles.emptyActionButton, { backgroundColor: colors.text + '10' }]}
        onPress={handleBrowseArticles}
        accessibilityLabel="Go to articles to build words"
        accessibilityRole="button"
      >
        <ThemedText type="bodyBold">Articles</ThemedText>
        <Ionicons name="arrow-forward" size={16} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
});

VocabularyEmptyState.displayName = 'VocabularyEmptyState';

const styles = StyleSheet.create({
  enhancedEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  messageContainer: {
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  submessageContainer: {
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
  },
});
