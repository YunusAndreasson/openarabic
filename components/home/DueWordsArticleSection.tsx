import React from 'react';
import { StyleSheet, View } from 'react-native';
import ArticleSection from '../../components/article/ArticleSection';
import { ThemedText } from '../../components/ThemedText';
import { useArticlesByDueWords } from '../../hooks/useArticlesByDueWords';
import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';

interface DueWordsArticleSectionProps {
  userId: string | undefined;
  onArticlePress: (article: Article) => void;
  limit?: number;
}

/**
 * Section showing articles that contain words due for review
 * Uses the existing ArticleSection component for consistent UI
 */
export function DueWordsArticleSection({
  userId,
  onArticlePress,
  limit = 10,
}: DueWordsArticleSectionProps) {
  const { articles, dueWordsCount, hasEnoughArticles } = useArticlesByDueWords(userId, limit);

  // Don't render if we don't have enough articles with due words
  if (!hasEnoughArticles) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ArticleSection
        title="Recommended Reading"
        articles={articles}
        onArticlePress={onArticlePress}
        hideDifficulty={true}
        emptyStateMessage="No recommended articles found"
      />
      <ThemedText type="caption" variant="subtle" style={styles.hintText}>
        Contains {dueWordsCount} words you need to review
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  hintText: {
    marginTop: -LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    opacity: 0.7,
  },
});
