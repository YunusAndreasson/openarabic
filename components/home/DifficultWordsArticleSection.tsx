import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useArticlesByDifficultWords } from '../../hooks/useArticlesByDifficultWords';
import type { Article } from '../../types/articles.types';
import ArticleSection from '../article/ArticleSection';

const EMPTY_DIFFICULT_WORDS_SET = new Set<number>();

interface DifficultWordsArticleSectionProps {
  userId: string | undefined;
  onArticlePress: (article: Article) => void;
  limit?: number;
  difficultWordRootIds?: Set<number>; // Set of root IDs for words that are difficult
}

/**
 * Section showing articles that contain difficult words for the user
 * Uses the existing ArticleSection component for consistent UI
 */
export function DifficultWordsArticleSection({
  userId,
  onArticlePress,
  limit = 10,
  difficultWordRootIds = EMPTY_DIFFICULT_WORDS_SET,
}: DifficultWordsArticleSectionProps) {
  const { articles, hasEnoughArticles } = useArticlesByDifficultWords(userId, limit);

  // Don't render if we don't have enough articles with difficult words
  if (!hasEnoughArticles) {
    return null;
  }

  // Count UNIQUE difficult words for each article to avoid duplicates
  const getDifficultWordCount = (article: Article): number => {
    if (!article?.article_sentences?.length || !difficultWordRootIds.size) return 0;

    // Use a Set to track unique root IDs in this article
    const uniqueDifficultRootIds = new Set<number>();

    article.article_sentences.forEach(sentence => {
      sentence.sentence_words?.forEach(word => {
        if (word.root_id && difficultWordRootIds.has(word.root_id)) {
          uniqueDifficultRootIds.add(word.root_id);
        }
      });
    });

    // Return the count of unique root IDs
    return uniqueDifficultRootIds.size;
  };

  // Create a render function that includes the difficult word count
  const renderArticleWithDifficultCount = (article: Article) => {
    // Calculate difficult word count for this article
    const difficultWordCount = getDifficultWordCount(article);

    return {
      ...article,
      dueWordCount: difficultWordCount, // Reuse the dueWordCount field for display
    };
  };

  return (
    <View style={styles.container}>
      <ArticleSection
        articles={articles.map(renderArticleWithDifficultCount)}
        hideDifficulty={true}
        title="Practice Challenge"
        onArticlePress={onArticlePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Removed margins - SectionTitle handles all section spacing
  },
});
