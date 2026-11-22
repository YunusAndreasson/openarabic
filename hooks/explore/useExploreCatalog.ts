import { useQuery } from '@tanstack/react-query';

import { articleQueries } from '@/constants/queries';

export function useExploreCatalog(isRefreshing: boolean) {
  const {
    data: articlesData = [],
    isLoading,
    isFetching,
    isPaused,
    isError,
    refetch,
  } = useQuery(articleQueries.all());
  const hasCatalog = articlesData.length > 0;
  // A cold offline query is pending but paused. Only a running fetch needs a spinner.
  const isCatalogLoading = !hasCatalog && !isRefreshing && (isLoading || (isError && isFetching));
  const hasCatalogFailed = !hasCatalog && (isPaused || isError) && !isCatalogLoading;
  return { articlesData, isCatalogLoading, hasCatalogFailed, refetchCatalog: refetch };
}
