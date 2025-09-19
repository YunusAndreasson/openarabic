import type { JSX } from 'react';
import { memo } from 'react';

import HorizontalFeaturedSection from '@read/HorizontalFeaturedSection';

import type { Article } from '@/types/articles.types';

interface IntelligentArticleSectionProps {
  articlesData: Article[];
  refreshKey: number;
}

/**
 * Custom comparison function for React.memo optimization
 */
const IntelligentArticleSectionComparison = (
  prevProps: IntelligentArticleSectionProps,
  nextProps: IntelligentArticleSectionProps
): boolean => {
  // Quick path comparisons first (most likely to change)
  if (prevProps.refreshKey !== nextProps.refreshKey) return false;

  // Array reference and length checks
  if (prevProps.articlesData !== nextProps.articlesData) return false;
  if (prevProps.articlesData?.length !== nextProps.articlesData?.length) return false;

  return true;
};

/**
 * Simplified IntelligentArticleSection that uses the GenericFeaturedSection
 */
const IntelligentArticleSectionInternal = memo(function IntelligentArticleSectionInternal({
  articlesData,
  refreshKey,
}: IntelligentArticleSectionProps): JSX.Element | null {
  return (
    <HorizontalFeaturedSection articlesData={articlesData} refreshKey={refreshKey} scope="global" />
  );
},
IntelligentArticleSectionComparison);

export default IntelligentArticleSectionInternal;
