import { useCallback, useMemo, useState } from 'react';

import { STRINGS } from '@/constants/strings';
import {
  clearAllFilters,
  clearAuthors,
  selectActiveFiltersCount,
  setDateRange,
  setDifficultyRange,
  setSortField,
  toggleAuthor,
  type FilterState,
} from '@/store/filtersSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { Author } from '@/types/articles.types';
import { ContentDifficulty } from '@/types/enums';
import { selectionFeedback } from '@/utils/haptics';

export const DIFFICULTY_OPTIONS = [
  { key: 'beginner', label: ContentDifficulty.BEGINNER, range: [1, 2] as [number, number] },
  { key: 'intermediate', label: ContentDifficulty.INTERMEDIATE, range: [3, 3] as [number, number] },
  { key: 'advanced', label: ContentDifficulty.ADVANCED, range: [4, 5] as [number, number] },
  { key: 'all', label: STRINGS.ALL_DIFFICULTIES, range: [1, 5] as [number, number] },
];

export const DATE_RANGE_OPTIONS = [
  { key: 'week', label: STRINGS.PAST_WEEK },
  { key: 'month', label: STRINGS.PAST_MONTH },
  { key: 'all', label: STRINGS.ALL_TIME },
] as const;

export const AUTHOR_CHUNK_SIZE = 6;

type ExpandedSections = {
  authors: boolean;
  difficulty: boolean;
  dateRange: boolean;
};

export interface UseFilterModalResult {
  filters: FilterState['filters'];
  activeFiltersCount: number;
  expandedSections: ExpandedSections;
  toggleSection: (section: keyof ExpandedSections) => void;
  handleAuthorToggle: (authorId: number) => void;
  handleDifficultySelect: (range: [number, number]) => void;
  handleDateRangeSelect: (range: FilterState['filters']['dateRange']) => void;
  handleAuthorsAllSelect: () => void;
  handleClearAll: () => void;
  authorChunks: Author[][];
  selectedDifficultyOption: (typeof DIFFICULTY_OPTIONS)[number];
  selectedDateRangeOption: (typeof DATE_RANGE_OPTIONS)[number] | undefined;
  selectedAuthorsText: string;
  sort: FilterState['sort'];
  handleSortSelect: (field: FilterState['sort']['field']) => void;
}

export function useFilterModal(availableAuthors: Author[]): UseFilterModalResult {
  const dispatch = useAppDispatch();
  const filtersState = useAppSelector(state => state.filters);
  const activeFiltersCount = useAppSelector(selectActiveFiltersCount);

  // Provide default values if the state hasn't been rehydrated yet
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
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleAuthorToggle = useCallback(
    (authorId: number) => {
      selectionFeedback();
      dispatch(toggleAuthor(authorId));
    },
    [dispatch]
  );

  const handleAuthorsAllSelect = useCallback(() => {
    selectionFeedback();
    dispatch(clearAuthors());
  }, [dispatch]);

  const handleDifficultySelect = useCallback(
    (range: [number, number]) => {
      selectionFeedback();
      dispatch(setDifficultyRange(range));
    },
    [dispatch]
  );

  const handleDateRangeSelect = useCallback(
    (dateRange: FilterState['filters']['dateRange']) => {
      selectionFeedback();
      dispatch(setDateRange(dateRange));
    },
    [dispatch]
  );

  const handleClearAll = useCallback(() => {
    selectionFeedback();
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
      return STRINGS.ALL_AUTHORS;
    }
    if (selectedAuthorsCount === 1) {
      const selectedAuthor = availableAuthors.find(a => a.id === filters.authorIds[0]);
      return selectedAuthor ? selectedAuthor.name : `${selectedAuthorsCount} selected`;
    }
    return `${selectedAuthorsCount} selected`;
  }, [selectedAuthorsCount, availableAuthors, filters.authorIds]);

  const authorChunks = useMemo(() => {
    const chunks: Author[][] = [];
    for (let i = 0; i < availableAuthors.length; i += AUTHOR_CHUNK_SIZE) {
      chunks.push(availableAuthors.slice(i, i + AUTHOR_CHUNK_SIZE));
    }
    return chunks;
  }, [availableAuthors]);

  const selectedDateRangeOption = DATE_RANGE_OPTIONS.find(
    option => option.key === filters.dateRange
  );

  const sort = useAppSelector(state => state.filters.sort);

  const handleSortSelect = useCallback(
    (field: FilterState['sort']['field']) => {
      dispatch(setSortField(field));
    },
    [dispatch]
  );

  return {
    filters,
    activeFiltersCount,
    expandedSections,
    toggleSection,
    handleAuthorToggle,
    handleAuthorsAllSelect,
    handleDifficultySelect,
    handleDateRangeSelect,
    handleClearAll,
    authorChunks,
    selectedDateRangeOption,
    selectedAuthorsText,
    selectedDifficultyOption,
    sort,
    handleSortSelect,
  };
}

export default useFilterModal;
