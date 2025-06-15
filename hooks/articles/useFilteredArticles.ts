import { useMemo } from 'react';

import type { FilterState } from '@/store/filtersSlice';
import { useAppSelector } from '@/store/hooks';
import type { Article } from '@/types/articles.types';

/**
 * Custom hook to filter and sort articles based on Redux filter state
 */
export const useFilteredArticles = (articles: Article[]) => {
  const filtersState = useAppSelector(state => state.filters);

  // Provide default values if the state hasn't been rehydrated yet
  const sort = filtersState?.sort || {
    field: 'date' as const,
    direction: 'desc' as const,
  };

  const filters = filtersState?.filters || {
    authorIds: [],
    difficultyRange: [1, 5] as [number, number],
    dateRange: 'all' as const,
  };

  const comparators: Record<FilterState['sort']['field'], (a: Article, b: Article) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    author: (a, b) => a.author.name.localeCompare(b.author.name),
    date: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    difficulty: (a, b) => a.difficulty_level - b.difficulty_level,
  };

  // Pre-calculate date filter if needed
  const filterDate = useMemo(() => {
    if (filters.dateRange === 'all') return null;
    const date = new Date();
    if (filters.dateRange === 'week') {
      date.setDate(date.getDate() - 7);
    } else if (filters.dateRange === 'month') {
      date.setDate(date.getDate() - 30);
    }
    return date;
  }, [filters.dateRange]);

  const filteredAndSortedArticles = useMemo(() => {
    // Return empty array if articles are not provided or filters state is not ready
    if (!articles?.length || !filtersState) return [];

    // Apply filters
    const filteredArticles = articles.filter(article => {
      // Filter by authors
      if (
        filters.authorIds.length > 0 &&
        (!article.author || !filters.authorIds.includes(article.author.id))
      ) {
        return false;
      }

      // Filter by difficulty range
      if (
        (filters.difficultyRange[0] > 1 || filters.difficultyRange[1] < 5) &&
        (article.difficulty_level < filters.difficultyRange[0] ||
          article.difficulty_level > filters.difficultyRange[1])
      ) {
        return false;
      }

      // Filter by date range
      if (filterDate && new Date(article.created_at) < filterDate) {
        return false;
      }

      return true;
    });

    // Apply sorting
    return filteredArticles.sort((a, b) => {
      const comparator = comparators[sort.field];
      const result = comparator ? comparator(a, b) : 0;
      return sort.direction === 'desc' ? -result : result;
    });
  }, [articles, sort, filters, filterDate, filtersState]);

  return filteredAndSortedArticles;
};
