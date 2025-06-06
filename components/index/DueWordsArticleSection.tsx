import React from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';

import { ThemedCard } from '@/components';

import { LAYOUT } from '../../constants/layout';
import { useArticlesByDueWords } from '../../hooks/useArticlesByDueWords';
import { useColors } from '../../hooks/useColors';
import type { Article } from '../../types/articles.types';
import SectionTitle from '../SectionTitle';

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
  const { articles, hasEnoughArticles, dueWordsCount, isLoading } = useArticlesByDueWords(
    userId,
    limit
  );
  const colors = useColors();

  // Don't render if we don't have enough articles with due words
  if (!hasEnoughArticles && !isLoading) {
    return null;
  }

  // Count UNIQUE due words for each article to avoid duplicates
  const getDueWordCount = (article: Article): number => {
    if (!article?.article_sentences?.length || !dueWordRootIds.size) return 0;

    // Use a Set to track unique root IDs in this article
    const uniqueDueRootIds = new Set<number>();

    article.article_sentences.forEach(sentence => {
      sentence.sentence_words?.forEach(word => {
        if (word.root_id && dueWordRootIds.has(word.root_id)) {
          uniqueDueRootIds.add(word.root_id);
        }
      });
    });

    // Return the count of unique root IDs
    return uniqueDueRootIds.size;
  };

  // Create a render function that includes the due word count
  const renderArticleWithDueCount = (article: Article) => {
    // Calculate due word count for this article
    const dueWordCount = getDueWordCount(article);

    return {
      ...article,
      dueWordCount,
    };
  };

  // Dynamic title based on whether we have due words
  const sectionTitle = dueWordsCount > 0 ? 'Practice Reading' : 'Study Reading';

  // Dynamic subtitle based on whether we have due words
  const sectionSubtitle =
    dueWordsCount > 0 ? "Reinforce words you're reviewing" : 'Build vocabulary through reading';

  const articlesWithDueCount = articles.map(renderArticleWithDueCount);

  return (
    <View style={styles.container}>
      <SectionTitle title={sectionTitle} subtitle={sectionSubtitle} />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          accessibilityLabel={`${sectionTitle} articles`}
        >
          {articlesWithDueCount.map(article => (
            <ThemedCard
              key={`article-${article.id}`}
              style={styles.articleCard}
              variant="compact"
              article={article}
              handlePress={() => onArticlePress(article)}
              hideDifficulty={true}
              dueWordCount={article.dueWordCount}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  articleCard: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    // Removed margins - SectionTitle handles all section spacing
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  scrollContent: {
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
});
