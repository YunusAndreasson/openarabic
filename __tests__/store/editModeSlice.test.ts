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
  resetEditMode,
  toggleEditMode,
} from '../../store/editModeSlice';

describe('editModeSlice reducers', () => {
  let initialState: EditModeState;

  beforeEach(() => {
    initialState = {
      playlist: false,
    };
  });

  describe('toggleEditMode', () => {
    test('toggles playlist mode from false to true', () => {
      const state = reducer(initialState, toggleEditMode('playlist'));
      expect(state.playlist).toBeTruthy();
    });

    test('toggles playlist mode from true to false', () => {
      const modifiedState: EditModeState = { playlist: true };
      const state = reducer(modifiedState, toggleEditMode('playlist'));
      expect(state.playlist).toBeFalsy();
    });
  });

  describe('resetEditMode', () => {
    test('resets playlist mode to false', () => {
      const modifiedState: EditModeState = { playlist: true };
      const state = reducer(modifiedState, resetEditMode('playlist'));
      expect(state.playlist).toBeFalsy();
    });

    test('is idempotent (resetting already false mode stays false)', () => {
      const state = reducer(initialState, resetEditMode('playlist'));
      expect(state.playlist).toBeFalsy();
    });
  });

  describe('complex state transitions', () => {
    test('handles toggle → reset → toggle correctly', () => {
      let state = reducer(initialState, toggleEditMode('playlist'));
      expect(state).toEqual({ playlist: true });

      state = reducer(state, resetEditMode('playlist'));
      expect(state).toEqual({ playlist: false });

      state = reducer(state, toggleEditMode('playlist'));
      expect(state).toEqual({ playlist: true });
    });
  });
});
