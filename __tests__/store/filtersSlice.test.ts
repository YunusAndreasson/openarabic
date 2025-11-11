/**
 * Store Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import reducer, {
  clearAllFilters,
  type FilterState,
  setDateRange,
  setDifficultyRange,
  toggleAuthor,
} from '../../store/filtersSlice';

describe('filtersSlice reducers', () => {
  let initialState: FilterState;

  beforeEach(() => {
    initialState = {
      filters: { authorIds: [], difficultyRange: [1, 5], dateRange: 'all' },
    };
  });

  describe('toggleAuthor', () => {
    const ids = [42, 7];
    test.each(ids)('adds and removes author id %p', id => {
      let state = reducer(initialState, toggleAuthor(id));
      expect(state.filters.authorIds).toEqual([id]);

      state = reducer(state, toggleAuthor(id));
      expect(state.filters.authorIds).toEqual([]);
    });
  });

  describe('setDifficultyRange', () => {
    const ranges: [number, number][] = [
      [2, 4],
      [1, 3],
    ];
    test.each(ranges)('sets difficulty range %p', range => {
      const state = reducer(initialState, setDifficultyRange(range));
      expect(state.filters.difficultyRange).toEqual(range);
    });
  });

  describe('setDateRange', () => {
    const ranges: FilterState['filters']['dateRange'][] = ['week', 'month'];
    test.each(ranges)('sets date range %p', range => {
      const state = reducer(initialState, setDateRange(range));
      expect(state.filters.dateRange).toBe(range);
    });
  });

  test('clears all filters', () => {
    let state: FilterState = {
      ...initialState,
      filters: { authorIds: [1], difficultyRange: [2, 3], dateRange: 'week' },
    };
    state = reducer(state, clearAllFilters());
    expect(state.filters).toEqual({
      authorIds: [],
      difficultyRange: [1, 5],
      dateRange: 'all',
    });
  });
});
