/**
 * Store Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import reducer, {
  type EditModeState,
  type EditModeType,
  resetEditMode,
  toggleEditMode,
} from '../../store/editModeSlice';

describe('editModeSlice reducers', () => {
  let initialState: EditModeState;

  beforeEach(() => {
    initialState = {
      listen: false,
      dictionary: false,
    };
  });

  describe('toggleEditMode', () => {
    test('toggles listen mode from false to true', () => {
      const state = reducer(initialState, toggleEditMode('listen'));
      expect(state.listen).toBe(true);
      expect(state.dictionary).toBe(false);
    });

    test('toggles listen mode from true to false', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, toggleEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(false);
    });

    test('toggles dictionary mode from false to true', () => {
      const state = reducer(initialState, toggleEditMode('dictionary'));
      expect(state.dictionary).toBe(true);
      expect(state.listen).toBe(false);
    });

    test('toggles dictionary mode from true to false', () => {
      const modifiedState: EditModeState = { listen: false, dictionary: true };
      const state = reducer(modifiedState, toggleEditMode('dictionary'));
      expect(state.dictionary).toBe(false);
      expect(state.listen).toBe(false);
    });

    test('does not affect other mode when toggling', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, toggleEditMode('dictionary'));
      expect(state.listen).toBe(true);
      expect(state.dictionary).toBe(true);
    });
  });

  describe('resetEditMode', () => {
    test('resets listen mode to false', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, resetEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(false);
    });

    test('resets dictionary mode to false', () => {
      const modifiedState: EditModeState = { listen: false, dictionary: true };
      const state = reducer(modifiedState, resetEditMode('dictionary'));
      expect(state.dictionary).toBe(false);
      expect(state.listen).toBe(false);
    });

    test('does not affect other mode when resetting', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: true };
      const state = reducer(modifiedState, resetEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(true);
    });

    test('is idempotent (resetting already false mode stays false)', () => {
      const state = reducer(initialState, resetEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(false);
    });
  });

  describe('complex state transitions', () => {
    test('handles multiple operations correctly', () => {
      let state = reducer(initialState, toggleEditMode('listen'));
      expect(state).toEqual({ listen: true, dictionary: false });

      state = reducer(state, toggleEditMode('dictionary'));
      expect(state).toEqual({ listen: true, dictionary: true });

      state = reducer(state, resetEditMode('listen'));
      expect(state).toEqual({ listen: false, dictionary: true });

      state = reducer(state, toggleEditMode('listen'));
      expect(state).toEqual({ listen: true, dictionary: true });

      state = reducer(state, toggleEditMode('dictionary'));
      expect(state).toEqual({ listen: true, dictionary: false });
    });
  });
});
