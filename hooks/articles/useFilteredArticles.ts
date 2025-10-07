import { useMemo } from 'react';

import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAppSelector } from '@/store/hooks';
import type { Article } from '@/types/articles.types';
import { calculateFilterDate, filterArticles, sortArticlesByProgress } from '@/utils/articleUtils';

/**
 * Custom hook to filter and sort articles based on Redux filter state
 * Returns both filtered articles AND their reading progress data (single source of truth)
 */
export const useFilteredArticles = (articles: Article[] | null | undefined) => {
  const filtersState = useAppSelector(state => state.filters);

  // Handle null/undefined articles gracefully
  const safeArticles = articles || [];

  // Fetch bulk reading progress for all articles (single source of truth)
  const articleIds = useMemo(() => safeArticles.map(article => article.id), [safeArticles]);
  const { data: progressMapRaw = new Map(), isLoading: isProgressLoading } = useBulkReadingProgress(articleIds);
  // Ensure progressMap is always a Map to prevent runtime errors
  const progressMap = progressMapRaw instanceof Map ? progressMapRaw : new Map();

  // Provide default values if the state hasn't been rehydrated yet
  const filters = filtersState?.filters || {
    authorIds: [],
    difficultyRange: [1, 5] as [number, number],
    dateRange: 'all' as const,
  };

  // Pre-calculate date filter if needed
  const filterDate = useMemo(() => {
    return calculateFilterDate(filters.dateRange);
  }, [filters.dateRange]);

  const filteredAndSortedArticles = useMemo(() => {
    // Return empty array if articles are not provided
    if (!safeArticles.length) return [];

    // Apply filters using utility function
    const filteredArticles = filterArticles(safeArticles, filters, filterDate);

    // Apply progress-based sorting: articles with progress first, then no progress, then completed
    return sortArticlesByProgress(filteredArticles, progressMap);
  }, [safeArticles, filters, filterDate, progressMap]);

  // Return both articles and their progress data (single source of truth)
  return {
    articles: filteredAndSortedArticles,
    progressMap,
    isProgressLoading,
  };
};
