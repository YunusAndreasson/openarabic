import { useMemo } from 'react';

import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAppSelector } from '@/store/hooks';
import type { Article } from '@/types/articles.types';
import {
  calculateFilterDate,
  createComparators,
  filterArticles,
  sortArticles,
} from '@/utils/articleUtils';

/**
 * Custom hook to filter and sort articles based on Redux filter state
 */
export const useFilteredArticles = (articles: Article[]) => {
  const filtersState = useAppSelector(state => state.filters);

  // Fetch bulk reading progress for all articles (safely handles missing AuthProvider)
  const articleIds = useMemo(() => articles.map(article => article.id), [articles]);
  const { data: progressMapRaw = new Map() } = useSafeBulkReadingProgress(articleIds);
  // Ensure progressMap is always a Map to prevent runtime errors
  const progressMap = progressMapRaw instanceof Map ? progressMapRaw : new Map();

  // Provide default values if the state hasn't been rehydrated yet
  const sort = filtersState?.sort || {
    field: 'progress' as const,
    direction: 'desc' as const,
  };

  const filters = filtersState?.filters || {
    authorIds: [],
    difficultyRange: [1, 5] as [number, number],
    dateRange: 'all' as const,
  };

  // Create comparators using utility function
  const comparators = useMemo(() => {
    return createComparators(progressMap);
  }, [progressMap]);

  // Pre-calculate date filter if needed
  const filterDate = useMemo(() => {
    return calculateFilterDate(filters.dateRange);
  }, [filters.dateRange]);

  const filteredAndSortedArticles = useMemo(() => {
    // Return empty array if articles are not provided or filters state is not ready
    if (!articles?.length || !filtersState) return [];

    // Apply filters using utility function
    const filteredArticles = filterArticles(articles, filters, filterDate);

    // Apply sorting using utility function
    const comparator = comparators[sort.field];
    return sortArticles(filteredArticles, comparator, sort.direction);
  }, [articles, sort, filters, filterDate, filtersState, comparators]);

  return filteredAndSortedArticles;
};
