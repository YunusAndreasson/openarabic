import type { JSX } from 'react';

import type { Article } from '@/types/articles.types';

import { HorizontalFeaturedSection } from './HorizontalFeaturedSection';

interface IntelligentArticleSectionProps {
  articlesData: Article[];
  refreshKey: number;
}

/**
 * Simplified IntelligentArticleSection that uses the GenericFeaturedSection
 */
export function IntelligentArticleSection({
  articlesData,
  refreshKey,
}: IntelligentArticleSectionProps): JSX.Element | null {
  return (
    <HorizontalFeaturedSection articlesData={articlesData} refreshKey={refreshKey} scope="global" />
  );
}

IntelligentArticleSection.displayName = 'IntelligentArticleSection';
