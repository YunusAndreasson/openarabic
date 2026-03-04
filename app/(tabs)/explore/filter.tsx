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
  const searchParams = useLocalSearchParams<{ id: string; name?: string }>();
  const { id } = searchParams;
  const filterId = parseInt(id ?? '', 10);

  const {
    data: allArticles = [],
    isFetching,
    error,
    refetch,
  } = useQuery({
    ...articleQueries.all(),
    refetchOnMount: false,
    refetchOnReconnect: true,
  });

  const articles = useMemo(() => {
    if (!allArticles.length || filterId <= 0) return [];
    return allArticles.filter(article => article.category.id === filterId);
  }, [allArticles, filterId]);

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_ARTICLES}
        onRetry={refetch}
      />
    );
  }

  if (isFetching) {
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

  return (
    <FilteredArticleView
      articles={articles}
      onArticlePress={article => router.push(getArticleRoute(article.id, article.title))}
    />
  );
}
