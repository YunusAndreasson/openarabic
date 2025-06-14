import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import useFilterModal, {
  DIFFICULTY_OPTIONS,
  DATE_RANGE_OPTIONS,
} from '@/hooks/articles/useFilterModal';
import filtersReducer, {
  setSortField,
  toggleAuthor,
  setDifficultyRange,
  setDateRange,
  clearAllFilters,
  type FilterState,
} from '@/store/filtersSlice';

jest.mock('@/store/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
  lightFeedback: jest.fn(),
}));

const { useAppDispatch, useAppSelector } = require('@/store/hooks');

let mockDispatch: jest.Mock;
let state: FilterState;

beforeEach(() => {
  state = {
    sort: { field: 'date', direction: 'desc' },
    filters: { authorIds: [], difficultyRange: [1, 5], dateRange: 'all' },
  };

  mockDispatch = jest.fn(action => {
    state = filtersReducer(state, action);
  });

  (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
  (useAppSelector as jest.Mock).mockImplementation(selector => selector({ filters: state }));
});

describe('useFilterModal', () => {
  it('toggles expanded sections', () => {
    const { result } = renderHook(() => useFilterModal([]));

    act(() => {
      result.current.toggleSection('authors');
    });

    expect(result.current.expandedSections.authors).toBe(true);

    act(() => {
      result.current.toggleSection('authors');
    });

    expect(result.current.expandedSections.authors).toBe(false);
  });

  it('updates sort field and direction', () => {
    const { result, rerender } = renderHook(() => useFilterModal([]));

    act(() => {
      result.current.handleSortSelect('title');
    });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(setSortField('title'));
    expect(result.current.sort.field).toBe('title');
    expect(result.current.sort.direction).toBe('asc');

    act(() => {
      result.current.handleSortSelect('title');
    });
    rerender();

    expect(result.current.sort.direction).toBe('desc');
  });

  it('updates author, difficulty and date filters', () => {
    const authors = [
      { id: 1, name: 'Auth' },
      { id: 2, name: 'Other' },
    ] as any;
    const { result, rerender } = renderHook(() => useFilterModal(authors));

    act(() => {
      result.current.handleAuthorToggle(1);
    });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(toggleAuthor(1));
    expect(result.current.filters.authorIds).toEqual([1]);
    expect(result.current.selectedAuthorsText).toBe('Auth');

    act(() => {
      result.current.handleDifficultySelect(DIFFICULTY_OPTIONS[2].range);
    });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      setDifficultyRange(DIFFICULTY_OPTIONS[2].range)
    );
    expect(result.current.filters.difficultyRange).toEqual(
      DIFFICULTY_OPTIONS[2].range
    );
    expect(result.current.selectedDifficultyOption).toBe(DIFFICULTY_OPTIONS[2]);

    act(() => {
      result.current.handleDateRangeSelect('week');
    });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(setDateRange('week'));
    expect(result.current.filters.dateRange).toBe('week');
    expect(result.current.selectedDateRangeOption).toEqual(DATE_RANGE_OPTIONS[0]);
  });

  it('resets filters with clearAll', () => {
    const { result, rerender } = renderHook(() => useFilterModal([]));

    act(() => {
      result.current.handleAuthorToggle(1);
      result.current.handleDifficultySelect([3, 3]);
      result.current.handleDateRangeSelect('month');
    });
    rerender();

    expect(result.current.activeFiltersCount).toBe(3);

    act(() => {
      result.current.handleClearAll();
    });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(clearAllFilters());
    expect(result.current.filters.authorIds).toEqual([]);
    expect(result.current.filters.difficultyRange).toEqual([1, 5]);
    expect(result.current.filters.dateRange).toBe('all');
  });
});

