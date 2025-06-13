import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * Determine whether both articles and due words data have loaded.
 * Returns true when the articles query has either succeeded or failed
 * and, if a user is logged in, when the due words query is not loading.
 */
export function useArticlesAndDueWordsLoaded(): boolean {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Articles are considered loaded once the query resolves or errors
  const articlesQueryState = queryClient.getQueryState(['articles']);
  const articlesLoaded =
    articlesQueryState?.status === 'success' || articlesQueryState?.status === 'error';

  // Fetch a small sample of due words to check loading state
  const { isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 10);

  return useMemo(() => {
    if (!user?.id) return articlesLoaded;
    return articlesLoaded && !isDueWordsLoading;
  }, [articlesLoaded, isDueWordsLoading, user?.id]);
}
