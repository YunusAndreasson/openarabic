import { useCallback } from 'react';

import { STRINGS } from '@/constants/strings';
import { setSortField, type FilterState } from '@/store/filtersSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { SortOption } from '@/types/ui/sorting.types';
import { selectionFeedback } from '@/utils/haptics';

// Article sort options - Progress, Author, Difficulty (Title removed)
export const ARTICLE_SORT_OPTIONS: readonly SortOption<FilterState['sort']['field']>[] = [
  { key: 'progress', label: STRINGS.PROGRESS },
  { key: 'author', label: STRINGS.AUTHOR_FILTER },
  { key: 'difficulty', label: STRINGS.DIFFICULTY },
] as const;

export interface UseArticleSortingResult {
  currentSort: FilterState['sort']['field'];
  sortDirection: FilterState['sort']['direction'];
  onSortChange: (
    sort: FilterState['sort']['field'],
    direction: FilterState['sort']['direction']
  ) => void;
  sortOptions: typeof ARTICLE_SORT_OPTIONS;
}

export function useArticleSorting(): UseArticleSortingResult {
  const dispatch = useAppDispatch();
  const filtersState = useAppSelector(state => state.filters);

  // Provide default values if the state hasn't been rehydrated yet
  const currentSort = filtersState?.sort?.field || 'progress';
  const sortDirection = filtersState?.sort?.direction || 'desc';

  const onSortChange = useCallback(
    (sort: FilterState['sort']['field'], _direction: FilterState['sort']['direction']) => {
      // The direction parameter is ignored because setSortField handles direction logic internally
      selectionFeedback();
      dispatch(setSortField(sort));
    },
    [dispatch]
  );

  return {
    currentSort,
    sortDirection,
    onSortChange,
    sortOptions: ARTICLE_SORT_OPTIONS,
  };
}
