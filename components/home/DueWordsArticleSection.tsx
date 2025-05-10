import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import ArticleSection from '../../components/article/ArticleSection';
import { ThemedText } from '../../components/ThemedText';
import SectionTitle from '../../components/SectionTitle';
import { ArabicWord } from '../../components/article/ArabicWord';
import { useArticlesByDueWords } from '../../hooks/useArticlesByDueWords';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';
import type { SentenceWord } from '../../types/vocabulary.types';

interface DueWordsArticleSectionProps {
  userId: string | undefined;
  onArticlePress: (article: Article) => void;
  limit?: number;
  dueWordRootIds?: Set<number>; // Set of root IDs for words that are due for review
}

/**
 * Section showing articles that contain words due for review
 * Uses the existing ArticleSection component for consistent UI
 */
export function DueWordsArticleSection({
  userId,
  onArticlePress,
  limit = 10,
  dueWordRootIds = new Set(),
}: DueWordsArticleSectionProps) {
  const { articles, dueWordsCount, hasEnoughArticles } = useArticlesByDueWords(userId, limit);
  const colors = useColors();

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
        Contains {dueWordsCount} words you need to review (highlighted in orange)
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
