import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { router } from 'expo-router';

interface VocabularyEmptyStateProps {
  colors: any;
}

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
        />
      </View>
      <ThemedText style={styles.emptyTitle}>Build Your Vocabulary</ThemedText>
      <ThemedText style={styles.emptyMessage}>
        You haven't added any words to your study list yet.
      </ThemedText>
      <ThemedText style={styles.emptySubmessage}>
        Start reading articles and tap on words to add them to your vocabulary.
      </ThemedText>
      <TouchableOpacity
        style={[styles.emptyActionButton, { backgroundColor: colors.text + '10' }]}
        onPress={handleBrowseArticles}
      >
        <ThemedText style={styles.emptyActionText}>Browse Articles</ThemedText>
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
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  emptyTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  emptySubmessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    opacity: LAYOUT.OPACITY.DISABLED,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
  },
  emptyActionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginRight: LAYOUT.SPACING.SMALL,
  },
});
