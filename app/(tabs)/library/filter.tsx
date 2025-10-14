import ErrorState from '@common/ErrorState';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { useMemo } from 'react';


import { ThemedView } from '@/components/ThemedView';
import FilteredArticleView from '@/components/library/FilteredArticleView';
import PulsatingLoader from '@/components/ui/PulsatingLoader';
import { articleQueryOptions } from '@/constants/queryOptions';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

export default function FilterScreen(): JSX.Element {
  const searchParams = useLocalSearchParams<{ id: string; type: string; name?: string }>();
  const { id, type } = searchParams;
  const filterId = parseInt(id ?? '', 10);
  const filterType = type ?? 'category';
  // No need to clear cache - we're using preloaded articles and filtering locally

  // Use preloaded articles and filter locally - no network requests needed
  const {
    data: allArticles = [],
    isFetching,
    error,
    refetch,
  } = useQuery({
    ...articleQueryOptions.all(),
    refetchOnMount: false, // Don't refetch if data is fresh (2025 best practice)
    refetchOnReconnect: true, // Only refetch on network reconnection
  });

  // Filter articles locally based on filter type and ID
  const articles = useMemo(() => {
    if (!allArticles.length || filterId <= 0) return [];

    return allArticles.filter(article => {
      if (filterType === 'author') {
        return article.author.id === filterId;
      }
      if (filterType === 'difficulty') {
        return article.difficulty_level === filterId;
      }
      return article.category.id === filterId;
    });
  }, [allArticles, filterType, filterId]);

  // Show loader only when no articles are preloaded yet
  // Once articles are loaded, filtering is instant (no network requests)
  const shouldShowLoader = isFetching && allArticles.length === 0;

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
      filterType={filterType}
    />
  );
}
