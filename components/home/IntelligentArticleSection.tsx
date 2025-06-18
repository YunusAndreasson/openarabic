import type { JSX } from 'react';
import { useMemo, memo, useRef } from 'react';

import FeaturedSection from '@/components/home/FeaturedSection';
import { STRINGS } from '@/constants/strings';
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

  // Cache the initial selection to prevent flashing
  const initialSelectionRef = useRef<{ article: Article | null; refreshKey: number } | null>(null);

  // Use stable selection logic
  const currentArticle = useMemo(() => {
    if (!articlesData.length) {
      return {
        article: null,
        reason: STRINGS.LOADING_ARTICLES,
        type: 'random' as const,
        dueWordRootIds: new Set<number>(),
      };
    }

    // For initial load (refreshKey === 0), cache and reuse the first intelligent selection
    if (refreshKey === 0) {
      if (!initialSelectionRef.current || initialSelectionRef.current.refreshKey !== 0) {
        // First time or reset - cache the intelligent selection
        initialSelectionRef.current = {
          article: intelligentArticle.article,
          refreshKey: 0,
        };
      }

      // Use cached initial selection
      if (initialSelectionRef.current.article) {
        return {
          article: initialSelectionRef.current.article,
          reason: intelligentArticle.reason,
          type: intelligentArticle.type,
          dueWordRootIds: intelligentArticle.dueWordRootIds,
        };
      }
    }

    // For refresh (refreshKey > 0), pick a different article
    if (refreshKey > 0 && intelligentArticle.article) {
      const previousArticle = initialSelectionRef.current?.article || intelligentArticle.article;
      const availableArticles = articlesData.filter(article => article.id !== previousArticle.id);

      if (availableArticles.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableArticles.length);
        const newArticle = availableArticles[randomIndex] ?? null;

        if (newArticle) {
          // Update cache for future refreshes
          initialSelectionRef.current = {
            article: newArticle,
            refreshKey: refreshKey,
          };

          return {
            ...intelligentArticle,
            article: newArticle,
            reason: STRINGS.NEW_RECOMMENDATION_SELECTED,
          };
        }
      }
    }

    // Fallback to intelligent selection
    return intelligentArticle;
  }, [refreshKey, intelligentArticle, articlesData.length]);

  if (!currentArticle.article) {
    return null;
  }

  return <FeaturedSection article={currentArticle.article} onPress={onArticlePress} />;
});

export default IntelligentArticleSection;
