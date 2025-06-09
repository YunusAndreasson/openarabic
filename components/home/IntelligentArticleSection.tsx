import type { JSX } from 'react';
import React, { useCallback, useMemo } from 'react';

import FeaturedSection from '@/components/home/FeaturedSection';
import { useIntelligentArticleSelection } from '@/hooks/articles/useIntelligentArticleSelection';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Article } from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';

interface IntelligentArticleSectionProps {
  articlesData: Article[];
  refreshKey: number;
  onArticlePress: (article: Article) => void;
}

export default function IntelligentArticleSection({
  articlesData,
  refreshKey,
  onArticlePress,
}: IntelligentArticleSectionProps): JSX.Element | null {
  const { user } = useAuth();
  const intelligentArticle = useIntelligentArticleSelection(user, articlesData);

  // Optimize article selection - only recalculate when needed
  const currentArticle = useMemo(() => {
    if (!articlesData.length) {
      return {
        article: null,
        reason: 'Loading articles...',
        type: 'random' as const,
        dueWordRootIds: new Set<number>(),
      };
    }

    // For refresh: pick a different random article
    if (refreshKey > 0 && intelligentArticle.article) {
      const availableArticles = articlesData.filter(
        article => article.id !== intelligentArticle.article?.id
      );

      if (availableArticles.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableArticles.length);
        const newArticle = availableArticles[randomIndex];

        return {
          ...intelligentArticle,
          article: newArticle,
          reason: 'New recommendation selected for you',
        };
      }
    }

    return intelligentArticle;
  }, [intelligentArticle, refreshKey, articlesData.length]);

  const calculateDueWordsForArticle = useCallback(
    (article: Article, dueWordRootIds: Set<number>): number => {
      if (!user?.id || !dueWordRootIds || dueWordRootIds.size === 0) return 0;

      const uniqueDueRootIds = new Set<number>();

      article.article_sentences?.forEach(sentence => {
        sentence.sentence_words?.forEach((word: SentenceWord) => {
          if (word.root_id && dueWordRootIds.has(word.root_id)) {
            uniqueDueRootIds.add(word.root_id);
          }
        });
      });

      return uniqueDueRootIds.size;
    },
    [user?.id]
  );

  // Pre-calculate due words count to avoid expensive computation in render
  const dueWordsCount = useMemo(() => {
    if (!currentArticle.article || !user?.id || !currentArticle.dueWordRootIds.size) return 0;

    return calculateDueWordsForArticle(currentArticle.article, currentArticle.dueWordRootIds);
  }, [
    currentArticle.article?.id,
    currentArticle.dueWordRootIds,
    user?.id,
    calculateDueWordsForArticle,
  ]);

  if (!currentArticle.article) {
    return null;
  }

  return (
    <FeaturedSection
      article={currentArticle.article}
      dueWordCount={dueWordsCount > 0 ? dueWordsCount : undefined}
      onPress={onArticlePress}
    />
  );
}
