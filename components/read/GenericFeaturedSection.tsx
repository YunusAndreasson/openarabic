import React, { memo, type JSX } from 'react';

import FeaturedSection from '@read/FeaturedSection';

import { useFeaturedArticleSelection } from '@/hooks/articles/useFeaturedArticleSelection';
import type { Article } from '@/types/articles.types';

interface GenericFeaturedSectionProps {
  articlesData: Article[];
  refreshKey: number;
  scope?: string;
  onArticlePress: (article: Article) => void;
}

function GenericFeaturedSectionInternal({
  articlesData,
  refreshKey,
  scope = 'global',
  onArticlePress,
}: GenericFeaturedSectionProps): JSX.Element | null {
  const { article } = useFeaturedArticleSelection(articlesData, refreshKey, scope);

  if (!article) return null;

  return <FeaturedSection article={article} onPress={onArticlePress} />;
}

export default memo(GenericFeaturedSectionInternal);
