/**
 * Store Tests
 *
 * Modern Jest 29 Patterns:
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import reducer, {
  type BookmarksState,
  removeFromCustomOrder,
  setCustomOrder,
} from '../../store/playlistSlice';

describe('playlistSlice reducers', () => {
  let initialState: BookmarksState;

  beforeEach(() => {
    initialState = {
      customOrder: [],
    };
  });

  describe('initial state', () => {
    test('has empty customOrder array', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state.customOrder).toEqual([]);
    });
  });

  describe('setCustomOrder', () => {
    test('sets custom order with new array', () => {
      const state = reducer(initialState, setCustomOrder([1, 2, 3]));
      expect(state.customOrder).toEqual([1, 2, 3]);
    });

    test('replaces existing order completely', () => {
      const existing: BookmarksState = { customOrder: [1, 2, 3] };
      const state = reducer(existing, setCustomOrder([4, 5]));
      expect(state.customOrder).toEqual([4, 5]);
    });

    test('handles empty array', () => {
      const existing: BookmarksState = { customOrder: [1, 2, 3] };
      const state = reducer(existing, setCustomOrder([]));
      expect(state.customOrder).toEqual([]);
    });

    test('handles single item array', () => {
      const state = reducer(initialState, setCustomOrder([42]));
      expect(state.customOrder).toEqual([42]);
    });

    test('handles large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const state = reducer(initialState, setCustomOrder(largeArray));
      expect(state.customOrder).toHaveLength(1000);
      expect(state.customOrder[0]).toBe(0);
      expect(state.customOrder[999]).toBe(999);
    });

    test('preserves order of items', () => {
      const state = reducer(initialState, setCustomOrder([5, 1, 3, 2, 4]));
      expect(state.customOrder).toEqual([5, 1, 3, 2, 4]);
    });
  });

  describe('removeFromCustomOrder', () => {
    test('removes article by ID', () => {
      const existing: BookmarksState = { customOrder: [1, 2, 3] };
      const state = reducer(existing, removeFromCustomOrder(2));
      expect(state.customOrder).toEqual([1, 3]);
    });

    test('removes first item correctly', () => {
      const existing: BookmarksState = { customOrder: [1, 2, 3] };
      const state = reducer(existing, removeFromCustomOrder(1));
      expect(state.customOrder).toEqual([2, 3]);
    });

    test('removes last item correctly', () => {
      const existing: BookmarksState = { customOrder: [1, 2, 3] };
      const state = reducer(existing, removeFromCustomOrder(3));
      expect(state.customOrder).toEqual([1, 2]);
    });

    test('does nothing if ID not found', () => {
      const existing: BookmarksState = { customOrder: [1, 2, 3] };
      const state = reducer(existing, removeFromCustomOrder(999));
      expect(state.customOrder).toEqual([1, 2, 3]);
    });

    test('handles empty array gracefully', () => {
      const state = reducer(initialState, removeFromCustomOrder(1));
      expect(state.customOrder).toEqual([]);
    });

    test('handles duplicate IDs - removes all occurrences', () => {
      const existing: BookmarksState = { customOrder: [1, 2, 1, 3, 1] };
      const state = reducer(existing, removeFromCustomOrder(1));
      expect(state.customOrder).toEqual([2, 3]);
    });

    test('removes only specified ID, preserves others', () => {
      const existing: BookmarksState = { customOrder: [10, 20, 30, 40, 50] };
      const state = reducer(existing, removeFromCustomOrder(30));
      expect(state.customOrder).toEqual([10, 20, 40, 50]);
    });

    test('handles single item removal leaving empty array', () => {
      const existing: BookmarksState = { customOrder: [42] };
      const state = reducer(existing, removeFromCustomOrder(42));
      expect(state.customOrder).toEqual([]);
    });
  });

  describe('complex state transitions', () => {
    test('handles sequence of set and remove operations', () => {
      let state = reducer(initialState, setCustomOrder([1, 2, 3, 4, 5]));
      expect(state.customOrder).toEqual([1, 2, 3, 4, 5]);

      state = reducer(state, removeFromCustomOrder(3));
      expect(state.customOrder).toEqual([1, 2, 4, 5]);

      state = reducer(state, removeFromCustomOrder(1));
      expect(state.customOrder).toEqual([2, 4, 5]);

      state = reducer(state, setCustomOrder([...state.customOrder, 10]));
      expect(state.customOrder).toEqual([2, 4, 5, 10]);
    });

    test('handles reordering via set after remove', () => {
      let state = reducer(initialState, setCustomOrder([1, 2, 3]));
      state = reducer(state, removeFromCustomOrder(2));

      // Simulate reorder by setting new order
      state = reducer(state, setCustomOrder([3, 1]));
      expect(state.customOrder).toEqual([3, 1]);
    });

    test('handles multiple consecutive removes', () => {
      let state = reducer(initialState, setCustomOrder([1, 2, 3, 4, 5]));
      state = reducer(state, removeFromCustomOrder(1));
      state = reducer(state, removeFromCustomOrder(3));
      state = reducer(state, removeFromCustomOrder(5));
      expect(state.customOrder).toEqual([2, 4]);
    });
  });
});
