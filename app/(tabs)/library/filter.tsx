import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { useEffect, useState } from 'react';

import ErrorState from '@common/ErrorState';

import { ThemedView } from '@/components/ThemedView';
import FilteredArticleView from '@/components/library/FilteredArticleView';
import PulsatingLoader from '@/components/ui/PulsatingLoader';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

export default function FilterScreen(): JSX.Element {
  const searchParams = useLocalSearchParams<{ id: string; type: string; name?: string }>();
  const { id, type } = searchParams;
  const filterId = parseInt(id ?? '', 10);
  const filterType = type ?? 'category';
  const queryClient = useQueryClient();
  const [showLoader, setShowLoader] = useState(true);

  // Clear cache when filter type or ID changes to prevent stale data
  useEffect(() => {
    if (filterId > 0) {
      // Invalidate all filtered articles queries to prevent cache conflicts
      queryClient.invalidateQueries({ queryKey: ['filtered-articles'] });
    }
  }, [filterType, filterId, queryClient]);

  const {
    data: articles = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Article[]>({
    queryKey: ['filtered-articles', filterType, filterId],
    queryFn: () => {
      if (filterType === 'author') {
        return articlesService.getArticles({
          authorId: filterId,
          sortBy: 'created_at',
        });
      }
      if (filterType === 'difficulty') {
        return articlesService.getArticles({
          minDifficulty: filterId,
          maxDifficulty: filterId,
          sortBy: 'created_at',
        });
      }
      return articlesService.getArticles({
        categoryId: filterId,
        sortBy: 'created_at',
      });
    },
    enabled: filterId > 0,
    staleTime: 300000, // 5 minutes - shorter cache for better responsiveness
    gcTime: 1800000, // 30 minutes
    refetchOnMount: true, // Always refetch on mount for fresh data
    refetchOnWindowFocus: false,
  });

  // Minimum loading time to prevent jarring transitions (2025 UX best practice)
  useEffect(() => {
    if (filterId > 0) {
      setShowLoader(true);
      const minLoadingTimer = setTimeout(() => {
        setShowLoader(false);
      }, 500); // 500ms minimum loading time

      return () => clearTimeout(minLoadingTimer);
    }
    return undefined; // Explicit return for the case when filterId <= 0
  }, [filterId]);

  // Hide loader only when both conditions are met: data loaded AND minimum time passed
  const shouldShowLoader = showLoader && (isLoading || articles.length === 0);

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_ARTICLES}
        onRetry={refetch}
      />
    );
  }

  // Show loading state with minimum 500ms duration (2025 UX best practice)
  if (shouldShowLoader) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <PulsatingLoader size={64} />
      </ThemedView>
    );
  }

  // Always return FilteredArticleView for successful cases
  return (
    <FilteredArticleView
      articles={articles}
      loading={false} // Parent handles loading with minimum duration
      onArticlePress={article => router.push(getArticleRoute(article.id, article.title))}
    />
  );
}
