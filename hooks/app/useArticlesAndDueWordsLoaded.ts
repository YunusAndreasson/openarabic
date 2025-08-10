import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * Comprehensive validation for all data needed to show the Library tab properly.
 * Checks for:
 * - Categories loaded
 * - Authors loaded
 * - Main articles list loaded
 * - At least some per-category articles loaded (for filter functionality)
 * - Due words loaded (if user is authenticated)
 */
export function useReadTabDataLoaded(): boolean {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if core data is loaded
  const categoriesQueryState = queryClient.getQueryState(['categories']);
  const categoriesLoaded =
    categoriesQueryState?.status === 'success' || categoriesQueryState?.status === 'error';

  const authorsQueryState = queryClient.getQueryState(['authors']);
  const authorsLoaded =
    authorsQueryState?.status === 'success' || authorsQueryState?.status === 'error';

  const articlesQueryState = queryClient.getQueryState(['articles']);
  const articlesLoaded =
    articlesQueryState?.status === 'success' || articlesQueryState?.status === 'error';

  // Check if we have some per-category data loaded (for filter functionality)
  // We don't need ALL categories to have data, just some to show the Library tab
  const allQueries = queryClient.getQueryCache().getAll();
  const categoryArticleQueries = allQueries.filter(
    query =>
      query.queryKey[0] === 'filtered-articles' &&
      query.queryKey[1] === 'category' &&
      (query.state.status === 'success' || query.state.status === 'error')
  );
  const hasSomeCategoryData = categoryArticleQueries.length > 0;

  // Check due words loading state for authenticated users
  const { isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 10);

  return useMemo(() => {
    // Core data must be loaded
    const coreDataLoaded = categoriesLoaded && authorsLoaded && articlesLoaded;

    // For unauthenticated users, just need core data and some category data
    if (!user?.id) {
      return coreDataLoaded && hasSomeCategoryData;
    }

    // For authenticated users, also need due words to not be loading
    return coreDataLoaded && hasSomeCategoryData && !isDueWordsLoading;
  }, [
    categoriesLoaded,
    authorsLoaded,
    articlesLoaded,
    hasSomeCategoryData,
    isDueWordsLoading,
    user?.id,
  ]);
}
