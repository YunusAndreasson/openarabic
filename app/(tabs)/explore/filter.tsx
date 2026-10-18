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
    data: articles,
    isPending,
    isError,
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

  // Both states stand in for a list that does not exist yet. Gated on
  // `isFetching`, a reconnect or an Explore pull-to-refresh swapped a list the
  // learner was scrolling for a spinner and threw away their place; a failed
  // background refetch likewise keeps the cached list on screen.
  if (isPending) {
    return <LoadingState />;
  }

  if (isError && articles === undefined) {
    return <ErrorState message={STRINGS.FAILED_TO_LOAD_ARTICLES} onRetry={() => void refetch()} />;
  }

  return <FilteredArticleView articles={articles} onArticlePress={handleArticlePress} />;
}
