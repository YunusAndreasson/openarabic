import type { JSX } from 'react';
import { memo, useCallback, useMemo } from 'react';

import FeaturedSection from '@/components/home/FeaturedSection';
import { useFeaturedArticleSelection } from '@/hooks/articles/useFeaturedArticleSelection';
import type { Article } from '@/types/articles.types';

interface GenericFeaturedSectionProps {
  /**
   * Articles to select from (can be all articles or filtered subset)
   */
  articlesData: Article[];

  /**
   * Key to trigger new selections
   */
  refreshKey: number;

  /**
   * Scope identifier for caching ('global', 'category-{id}', etc.)
   */
  scope?: string;

  /**
   * Callback when an article is pressed
   */
  onArticlePress: (article: Article) => void;
}

/**
 * Custom comparison function for React.memo optimization
 */
const GenericFeaturedSectionComparison = (
  prevProps: GenericFeaturedSectionProps,
  nextProps: GenericFeaturedSectionProps
): boolean => {
  // Quick path comparisons first (most likely to change)
  if (prevProps.refreshKey !== nextProps.refreshKey) return false;
  if (prevProps.scope !== nextProps.scope) return false;
  if (prevProps.onArticlePress !== nextProps.onArticlePress) return false;

  // Array reference and length checks
  if (prevProps.articlesData !== nextProps.articlesData) return false;
  if (prevProps.articlesData?.length !== nextProps.articlesData?.length) return false;

  return true;
};

/**
 * Internal component implementation
 */
const GenericFeaturedSectionInternal = memo(function GenericFeaturedSectionInternal({
  articlesData,
  refreshKey,
  scope = 'global',
  onArticlePress,
}: GenericFeaturedSectionProps): JSX.Element | null {
  // Use the new generic featured article selection hook
  const featuredArticle = useFeaturedArticleSelection(articlesData, refreshKey, scope);

  const selectedArticle = useMemo(() => featuredArticle.article, [featuredArticle.article]);

  const memoizedOnPress = useCallback(
    (article: Article) => {
      onArticlePress(article);
    },
    [onArticlePress]
  );

  const featuredSectionProps = useMemo(() => {
    if (!selectedArticle) return null;
    return {
      article: selectedArticle,
      onPress: memoizedOnPress,
    };
  }, [selectedArticle, memoizedOnPress]);

  // Early return if no article selected
  if (!featuredSectionProps) {
    return null;
  }

  return <FeaturedSection {...featuredSectionProps} />;
},
GenericFeaturedSectionComparison);

export default GenericFeaturedSectionInternal;
