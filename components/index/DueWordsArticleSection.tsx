import React from 'react';
import { StyleSheet, View } from 'react-native';
import ArticleSection from '../article/ArticleSection';
import { useArticlesByDueWords } from '../../hooks/useArticlesByDueWords';
import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';

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
  const { articles, hasEnoughArticles, dueWordsCount } = useArticlesByDueWords(userId, limit);

  // Don't render if we don't have enough articles with due words
  if (!hasEnoughArticles) {
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
  const sectionTitle = dueWordsCount > 0 ? 'Recommended Reading' : 'Practice Reading';

  return (
    <View style={styles.container}>
      <ArticleSection
        title={sectionTitle}
        articles={articles.map(renderArticleWithDueCount)}
        onArticlePress={onArticlePress}
        hideDifficulty={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Removed margins - SectionTitle handles all section spacing
  },
});
