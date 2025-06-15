import type { JSX } from 'react';
import React, { useMemo, memo } from 'react';

import FeaturedSection from '@/components/home/FeaturedSection';
import { useIntelligentArticleSelection } from '@/hooks/articles/useIntelligentArticleSelection';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Article } from '@/types/articles.types';

interface IntelligentArticleSectionProps {
  articlesData: Article[];
  refreshKey: number;
  onArticlePress: (article: Article) => void;
}

const IntelligentArticleSection = memo(function IntelligentArticleSection({
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
        article => article.id !== intelligentArticle.article!.id
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

  // Pre-calculate due words count to avoid expensive computation in render

  if (!currentArticle.article) {
    return null;
  }

  return <FeaturedSection article={currentArticle.article} onPress={onArticlePress} />;
});

export default IntelligentArticleSection;
