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
    isFetching, // Tracks if actively fetching from network
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
    staleTime: 300000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 1800000, // 30 minutes cache
    refetchOnMount: false, // Don't refetch if data is fresh (2025 best practice)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Only refetch on network reconnection
  });

  // Smart loader logic: 2025 UX best practice
  // - Don't show loader if data is cached and fresh
  // - Only show loader when actually fetching from network
  // - Minimum time prevents jarring transitions for network requests
  useEffect(() => {
    if (filterId > 0 && isFetching) {
      // Only show loader when actually fetching from network
      setShowLoader(true);
      const minLoadingTimer = setTimeout(() => {
        setShowLoader(false);
      }, 300); // Reduced to 300ms for better UX with network requests

      return () => clearTimeout(minLoadingTimer);
    } else {
      // Data is cached or not loading - hide loader immediately
      setShowLoader(false);
    }
    return undefined;
  }, [filterId, isFetching]);

  // Show loader only when: actively fetching from network AND minimum time hasn't passed
  const shouldShowLoader = showLoader && isFetching;

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_ARTICLES}
        onRetry={refetch}
      />
    );
  }

  // Show loading state only when actually fetching from network (2025 UX best practice)
  // - No loader for cached data (instant UX)
  // - 300ms minimum for network requests (prevents jarring transitions)
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
      loading={isFetching} // Only show loading when actively fetching from network
      onArticlePress={article => router.push(getArticleRoute(article.id, article.title))}
    />
  );
}
