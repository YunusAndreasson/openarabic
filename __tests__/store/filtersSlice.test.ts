/**
 * Store Tests
 *
 * Modern Jest 29 Patterns:
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import reducer, { type FilterState } from '../../store/filtersSlice';

describe('filtersSlice', () => {
  describe('initial state', () => {
    test('returns initial state for unknown action', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toBeDefined();
      expect(state.filters).toBeDefined();
    });

    test('has empty authorIds array', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state.filters.authorIds).toEqual([]);
    });

    test('has full difficultyRange [1, 5]', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state.filters.difficultyRange).toEqual([1, 5]);
    });

    test('has dateRange set to "all"', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state.filters.dateRange).toBe('all');
    });
  });

  describe('state shape', () => {
    test('filters object has all required properties', () => {
      const state = reducer(undefined, { type: 'unknown' });

      expect(state.filters).toHaveProperty('authorIds');
      expect(state.filters).toHaveProperty('difficultyRange');
      expect(state.filters).toHaveProperty('dateRange');
    });

    test('difficultyRange has exactly two elements', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state.filters.difficultyRange).toHaveLength(2);
    });

    test('difficultyRange min is less than or equal to max', () => {
      const state = reducer(undefined, { type: 'unknown' });
      const [min, max] = state.filters.difficultyRange;
      expect(min).toBeLessThanOrEqual(max);
    });
  });

  describe('state immutability', () => {
    test('unknown action does not modify state', () => {
      const initialState: FilterState = {
        filters: {
          authorIds: [1, 2, 3],
          difficultyRange: [2, 4],
          dateRange: 'week',
        },
      };

      const state = reducer(initialState, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });
});
