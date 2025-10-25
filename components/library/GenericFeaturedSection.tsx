import React, { memo, type JSX } from 'react';

import { FeaturedSection } from '@/components/library/FeaturedSection';
import { useFeaturedArticleSelection } from '@/hooks/articles/useFeaturedArticleSelection';
import type { Article } from '@/types/articles.types';

interface GenericFeaturedSectionProps {
  articlesData: Article[];
  refreshKey: number;
  scope?: string;
}

const GenericFeaturedSectionInternal = ({
  articlesData,
  refreshKey,
  scope = 'global',
}: GenericFeaturedSectionProps): JSX.Element | null => {
  const { article } = useFeaturedArticleSelection(articlesData, refreshKey, scope);

  if (!article) return null;

  return <FeaturedSection article={article} />;
};

export const GenericFeaturedSection = memo(GenericFeaturedSectionInternal);
