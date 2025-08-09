import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

import ErrorState from '@common/ErrorState';
import FilteredArticleView from '@read/FilteredArticleView';

import { STRINGS } from '@/constants/strings';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

export default function CategoryFilterScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id ?? '', 10);

  const {
    data: articles = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Article[]>({
    queryKey: ['filtered-articles', 'category', categoryId],
    queryFn: () => articlesService.getArticles({ categoryId, limit: 200, sortBy: 'created_at' }),
    enabled: categoryId > 0,
    staleTime: 3600000,
    gcTime: 7200000,
  });

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_ARTICLES}
        onRetry={refetch}
      />
    );
  }

  return <FilteredArticleView articles={articles} loading={isLoading} />;
}
