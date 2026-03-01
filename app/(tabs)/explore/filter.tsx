import { ErrorState } from '@/components/common';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { useMemo } from 'react';

import { ThemedView } from '@/components/ThemedView';
import { FilteredArticleView } from '@/components/explore';
import { PulsatingLoader } from '@/components/ui';
import { articleQueries } from '@/constants/queries';
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
    ...articleQueries.all(),
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
        // Map UI bucket (1-3) to database difficulty levels (1-5)
        // Beginner (1): levels 1-2, Intermediate (2): levels 3-4, Advanced (3): level 5
        const diffLevel = article.difficulty_level ?? 3;
        if (filterId === 1) return diffLevel <= 2;
        if (filterId === 2) return diffLevel >= 3 && diffLevel <= 4;
        if (filterId === 3) return diffLevel >= 5;
        return false;
      }
      if (filterType === 'length') {
        // Map UI bucket (1-3) to reading time: Short (1-2min), Medium (3-5min), Long (6+min)
        const minutes = Math.ceil(article.article_sentences.length / 4);
        if (filterId === 1) return minutes <= 2;
        if (filterId === 2) return minutes >= 3 && minutes <= 5;
        if (filterId === 3) return minutes >= 6;
        return false;
      }
      return article.category.id === filterId;
    });
  }, [allArticles, filterType, filterId]);

  // Show loader while fetching (articles are guaranteed to exist once loaded)
  const shouldShowLoader = isFetching;

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
