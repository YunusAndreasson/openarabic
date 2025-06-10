import { useMemo } from 'react';

import { useAppSelector } from '@/store/hooks';
import type { Article } from '@/types/articles.types';

/**
 * Custom hook to filter and sort articles based on Redux filter state
 */
export const useFilteredArticles = (articles: Article[]) => {
  const { sort, filters } = useAppSelector(state => state.filters);

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
    if (!articles.length) return [];

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
      let result = 0;

      switch (sort.field) {
        case 'title':
          result = a.title.localeCompare(b.title);
          break;
        case 'author':
          result = (a.author?.name || '').localeCompare(b.author?.name || '');
          break;
        case 'date':
          result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'difficulty':
          result = a.difficulty_level - b.difficulty_level;
          break;
      }

      return sort.direction === 'desc' ? -result : result;
    });
  }, [articles, sort, filters, filterDate]);

  return filteredAndSortedArticles;
};
