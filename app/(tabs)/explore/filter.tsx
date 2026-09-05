import { ErrorState, LoadingState } from '@/components/common';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, type JSX } from 'react';

import type { Article } from '@/types/articles.types';
import type { FilterParams } from '@/types/navigation.types';

import { FilteredArticleView } from '@/components/explore';
import { articleQueries } from '@/constants/queries';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

export default function FilterScreen(): JSX.Element {
  const searchParams = useLocalSearchParams<FilterParams>();
  const { id } = searchParams;
  const filterId = parseInt(id ?? '', 10);

  const {
    data: articles = [],
    isFetching,
    error,
    refetch,
  } = useQuery({
    ...articleQueries.all(),
    select: data => (filterId > 0 ? data.filter(article => article.category.id === filterId) : []),
    refetchOnMount: false,
    refetchOnReconnect: true,
  });

  // Stable identity: FilteredArticleView's renderItem depends on this callback
  const handleArticlePress = useCallback((article: Article) => {
    router.push(getArticleRoute(article.id, article.title));
  }, []);

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_ARTICLES}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isFetching) {
    return <LoadingState />;
  }

  return <FilteredArticleView articles={articles} onArticlePress={handleArticlePress} />;
}
