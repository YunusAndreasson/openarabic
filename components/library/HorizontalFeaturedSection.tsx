import type { JSX } from 'react';
import { memo, useMemo } from 'react';

import HorizontalArticleSlider from '@/components/library/HorizontalArticleSlider';
import { useMultipleFeaturedArticles } from '@/hooks/articles/useMultipleFeaturedArticles';
import type { Article } from '@/types/articles.types';

interface HorizontalFeaturedSectionProps {
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
}

/**
 * Custom comparison function for React.memo optimization
 */
const HorizontalFeaturedSectionComparison = (
  prevProps: HorizontalFeaturedSectionProps,
  nextProps: HorizontalFeaturedSectionProps
): boolean => {
  // Quick path comparisons first (most likely to change)
  if (prevProps.refreshKey !== nextProps.refreshKey) return false;
  if (prevProps.scope !== nextProps.scope) return false;

  // Array reference and length checks
  if (prevProps.articlesData !== nextProps.articlesData) return false;
  if (prevProps.articlesData?.length !== nextProps.articlesData?.length) return false;

  return true;
};

/**
 * Internal component implementation
 */
const HorizontalFeaturedSectionInternal = memo(function HorizontalFeaturedSectionInternal({
  articlesData,
  refreshKey,
  scope = 'global',
}: HorizontalFeaturedSectionProps): JSX.Element | null {
  // Use the multiple featured articles selection hook
  const featuredArticles = useMultipleFeaturedArticles(articlesData, refreshKey, scope);

  const selectedArticles = useMemo(() => featuredArticles.articles, [featuredArticles.articles]);

  const sliderProps = useMemo(() => {
    if (!selectedArticles.length) return null;
    return {
      articles: selectedArticles,
    };
  }, [selectedArticles]);

  // Early return if no articles selected
  if (!sliderProps) {
    return null;
  }

  return <HorizontalArticleSlider {...sliderProps} />;
},
HorizontalFeaturedSectionComparison);

export default HorizontalFeaturedSectionInternal;
