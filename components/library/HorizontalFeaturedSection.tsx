import type { JSX } from 'react';

import { HorizontalArticleSlider } from '@/components/library';
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

export function HorizontalFeaturedSection({
  articlesData,
  refreshKey,
  scope = 'global',
}: HorizontalFeaturedSectionProps): JSX.Element | null {
  // Use the multiple featured articles selection hook
  const featuredArticles = useMultipleFeaturedArticles(articlesData, refreshKey, scope);

  const selectedArticles = featuredArticles.articles;

  return <HorizontalArticleSlider articles={selectedArticles} />;
}

HorizontalFeaturedSection.displayName = 'HorizontalFeaturedSection';
