import { ErrorState, LoadingState } from '@/components/common';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, type JSX } from 'react';

import type { Article } from '@/types/articles.types';
import type { CategoryId } from '@/types/branded.types';
import type { FilterParams } from '@/types/navigation.types';
import { parsePositiveIntParam } from '@/utils/routeParams';

import { FilteredArticleView } from '@/components/explore';
import { articleQueries } from '@/constants/queries';
import { getArticleRoute } from '@/utils/routeBuilders';
import { STRINGS } from '@/constants/strings';

export default function FilterScreen(): JSX.Element {
  const searchParams = useLocalSearchParams<FilterParams>();
  const filterId = parsePositiveIntParam<CategoryId>(searchParams.id);

  const {
    data: articles,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...articleQueries.all(),
    select: data =>
      filterId === undefined ? [] : data.filter(article => article.category.id === filterId),
    refetchOnMount: false,
    refetchOnReconnect: true,
  });

  // Stable identity: FilteredArticleView's renderItem depends on this callback
  const handleArticlePress = useCallback((article: Article) => {
    router.push(getArticleRoute(article.id));
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
