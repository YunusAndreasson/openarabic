import type { JSX } from 'react';
import { View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { STRINGS } from '@/constants/strings';
import { useMultipleFeaturedArticles } from '@/hooks/articles/useMultipleFeaturedArticles';

import { HorizontalArticleSlider } from './HorizontalArticleSlider';
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
  const { articles } = useMultipleFeaturedArticles(articlesData, refreshKey, scope);

  if (articles.length === 0) return null;

  return (
    <View>
      <SectionLabel title={STRINGS.SECTION_FEATURED} />
      <HorizontalArticleSlider articles={articles} />
    </View>
  );
}

HorizontalFeaturedSection.displayName = 'HorizontalFeaturedSection';
