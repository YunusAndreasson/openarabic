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
      playlist: false,
      dictionary: false,
    };
  });

  describe('toggleEditMode', () => {
    test('toggles playlist mode from false to true', () => {
      const state = reducer(initialState, toggleEditMode('playlist'));
      expect(state.playlist).toBeTruthy();
      expect(state.dictionary).toBeFalsy();
    });

    test('toggles playlist mode from true to false', () => {
      const modifiedState: EditModeState = { playlist: true, dictionary: false };
      const state = reducer(modifiedState, toggleEditMode('playlist'));
      expect(state.playlist).toBeFalsy();
      expect(state.dictionary).toBeFalsy();
    });

    test('toggles dictionary mode from false to true', () => {
      const state = reducer(initialState, toggleEditMode('dictionary'));
      expect(state.dictionary).toBeTruthy();
      expect(state.playlist).toBeFalsy();
    });

    test('toggles dictionary mode from true to false', () => {
      const modifiedState: EditModeState = { playlist: false, dictionary: true };
      const state = reducer(modifiedState, toggleEditMode('dictionary'));
      expect(state.dictionary).toBeFalsy();
      expect(state.playlist).toBeFalsy();
    });

    test('does not affect other mode when toggling', () => {
      const modifiedState: EditModeState = { playlist: true, dictionary: false };
      const state = reducer(modifiedState, toggleEditMode('dictionary'));
      expect(state.playlist).toBeTruthy();
      expect(state.dictionary).toBeTruthy();
    });
  });

  describe('resetEditMode', () => {
    test('resets playlist mode to false', () => {
      const modifiedState: EditModeState = { playlist: true, dictionary: false };
      const state = reducer(modifiedState, resetEditMode('playlist'));
      expect(state.playlist).toBeFalsy();
      expect(state.dictionary).toBeFalsy();
    });

    test('resets dictionary mode to false', () => {
      const modifiedState: EditModeState = { playlist: false, dictionary: true };
      const state = reducer(modifiedState, resetEditMode('dictionary'));
      expect(state.dictionary).toBeFalsy();
      expect(state.playlist).toBeFalsy();
    });

    test('does not affect other mode when resetting', () => {
      const modifiedState: EditModeState = { playlist: true, dictionary: true };
      const state = reducer(modifiedState, resetEditMode('playlist'));
      expect(state.playlist).toBeFalsy();
      expect(state.dictionary).toBeTruthy();
    });

    test('is idempotent (resetting already false mode stays false)', () => {
      const state = reducer(initialState, resetEditMode('playlist'));
      expect(state.playlist).toBeFalsy();
      expect(state.dictionary).toBeFalsy();
    });
  });

  describe('complex state transitions', () => {
    test('handles multiple operations correctly', () => {
      let state = reducer(initialState, toggleEditMode('playlist'));
      expect(state).toEqual({ playlist: true, dictionary: false });

      state = reducer(state, toggleEditMode('dictionary'));
      expect(state).toEqual({ playlist: true, dictionary: true });

      state = reducer(state, resetEditMode('playlist'));
      expect(state).toEqual({ playlist: false, dictionary: true });

      state = reducer(state, toggleEditMode('playlist'));
      expect(state).toEqual({ playlist: true, dictionary: true });

      state = reducer(state, toggleEditMode('dictionary'));
      expect(state).toEqual({ playlist: true, dictionary: false });
    });
  });
});
