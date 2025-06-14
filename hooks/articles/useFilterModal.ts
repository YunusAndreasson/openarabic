import type { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useMemo } from 'react';
import type { ComponentProps } from 'react';

import {
  setSortField,
  toggleAuthor,
  setDifficultyRange,
  setDateRange,
  clearAllFilters,
  selectActiveFiltersCount,
  type FilterState,
} from '@/store/filtersSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { Author } from '@/types/articles.types';
import { selectionFeedback, lightFeedback } from '@/utils/haptics';

export const DIFFICULTY_OPTIONS = [
  { key: 'beginner', label: 'Beginner', range: [1, 2] as [number, number] },
  { key: 'intermediate', label: 'Intermediate', range: [3, 3] as [number, number] },
  { key: 'advanced', label: 'Advanced', range: [4, 5] as [number, number] },
  { key: 'all', label: 'All difficulties', range: [1, 5] as [number, number] },
];

export const DATE_RANGE_OPTIONS = [
  { key: 'week', label: 'Past week' },
  { key: 'month', label: 'Past month' },
  { key: 'all', label: 'All time' },
] as const;

interface SortOption {
  key: FilterState['sort']['field'];
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { key: 'title', label: 'Title', icon: 'text-outline' },
  { key: 'author', label: 'Author', icon: 'person-outline' },
  { key: 'date', label: 'Date added', icon: 'calendar-outline' },
  { key: 'difficulty', label: 'Difficulty', icon: 'trending-up-outline' },
] as const;

type ExpandedSections = {
  authors: boolean;
  difficulty: boolean;
  dateRange: boolean;
};

export interface UseFilterModalResult {
  sort: FilterState['sort'];
  filters: FilterState['filters'];
  activeFiltersCount: number;
  expandedSections: ExpandedSections;
  toggleSection: (section: keyof ExpandedSections) => void;
  handleSortSelect: (sortField: FilterState['sort']['field']) => void;
  handleAuthorToggle: (authorId: number) => void;
  handleDifficultySelect: (range: [number, number]) => void;
  handleDateRangeSelect: (range: FilterState['filters']['dateRange']) => void;
  handleClearAll: () => void;
  authorChunks: Author[][];
  selectedDifficultyOption: (typeof DIFFICULTY_OPTIONS)[number];
  selectedDateRangeOption: (typeof DATE_RANGE_OPTIONS)[number] | undefined;
  selectedAuthorsText: string;
}

export function useFilterModal(availableAuthors: Author[]): UseFilterModalResult {
  const dispatch = useAppDispatch();
  const filtersState = useAppSelector(state => state.filters);
  const activeFiltersCount = useAppSelector(selectActiveFiltersCount);

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

  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    authors: false,
    difficulty: false,
    dateRange: false,
  });

  const toggleSection = useCallback((section: keyof ExpandedSections) => {
    selectionFeedback();
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleSortSelect = useCallback(
    (sortField: FilterState['sort']['field']) => {
      selectionFeedback();
      dispatch(setSortField(sortField));
    },
    [dispatch]
  );

  const handleAuthorToggle = useCallback(
    (authorId: number) => {
      dispatch(toggleAuthor(authorId));
    },
    [dispatch]
  );

  const handleDifficultySelect = useCallback(
    (range: [number, number]) => {
      dispatch(setDifficultyRange(range));
    },
    [dispatch]
  );

  const handleDateRangeSelect = useCallback(
    (dateRange: FilterState['filters']['dateRange']) => {
      dispatch(setDateRange(dateRange));
    },
    [dispatch]
  );

  const handleClearAll = useCallback(() => {
    lightFeedback();
    dispatch(clearAllFilters());
  }, [dispatch]);

  const DIFFICULTY_FALLBACK = DIFFICULTY_OPTIONS[0] as (typeof DIFFICULTY_OPTIONS)[number];

  const selectedDifficultyOption: (typeof DIFFICULTY_OPTIONS)[number] = useMemo(() => {
    const found = DIFFICULTY_OPTIONS.find(
      option =>
        option.range[0] === filters.difficultyRange[0] &&
        option.range[1] === filters.difficultyRange[1]
    );
    return found ?? DIFFICULTY_OPTIONS[0] ?? DIFFICULTY_FALLBACK;
  }, [filters.difficultyRange]);

  const selectedAuthorsCount = filters.authorIds.length;
  const selectedAuthorsText = useMemo(() => {
    if (selectedAuthorsCount === 0) {
      return 'All authors';
    }
    if (selectedAuthorsCount === 1) {
      const selectedAuthor = availableAuthors.find(a => a.id === filters.authorIds[0]);
      return selectedAuthor?.name || 'Author';
    }
    return `${selectedAuthorsCount} selected`;
  }, [selectedAuthorsCount, availableAuthors, filters.authorIds]);

  const authorChunks = useMemo(() => {
    const chunkSize = 6;
    const chunks: Author[][] = [];
    for (let i = 0; i < availableAuthors.length; i += chunkSize) {
      chunks.push(availableAuthors.slice(i, i + chunkSize));
    }
    return chunks;
  }, [availableAuthors]);

  const selectedDateRangeOption = DATE_RANGE_OPTIONS.find(
    option => option.key === filters.dateRange
  );

  return {
    sort,
    filters,
    activeFiltersCount,
    expandedSections,
    toggleSection,
    handleSortSelect,
    handleAuthorToggle,
    handleDifficultySelect,
    handleDateRangeSelect,
    handleClearAll,
    authorChunks,
    selectedDateRangeOption,
    selectedAuthorsText,
    selectedDifficultyOption,
  };
}

export default useFilterModal;
