import { useMemo } from 'react';

import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import { sortArticlesByProgress } from '@/utils/articleUtils';

/**
 * Custom hook to sort articles by reading progress
 * Returns both articles AND their reading progress data (single source of truth)
 */
export const useFilteredArticles = (articles: Article[] | null | undefined) => {
  // Handle null/undefined articles gracefully
  const safeArticles = articles || [];

  // Fetch bulk reading progress for all articles (single source of truth)
  const articleIds = useMemo(() => safeArticles.map(article => article.id), [safeArticles]);
  const { data: progressMap, isLoading: isProgressLoading } = useBulkReadingProgress(articleIds);

  const filteredAndSortedArticles = useMemo(() => {
    if (!safeArticles.length) return [];
    // Sort: articles with progress first, then no progress, then completed
    return sortArticlesByProgress(safeArticles, progressMap);
  }, [safeArticles, progressMap]);

  // Return both articles and their progress data (single source of truth)
  return {
    articles: filteredAndSortedArticles,
    progressMap,
    isProgressLoading,
  };
};
