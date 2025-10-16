import reducer, {
  type EditModeState,
  type EditModeType,
  resetEditMode,
  setEditMode,
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
    it('toggles listen mode from false to true', () => {
      const state = reducer(initialState, toggleEditMode('listen'));
      expect(state.listen).toBe(true);
      expect(state.dictionary).toBe(false);
    });

    it('toggles listen mode from true to false', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, toggleEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(false);
    });

    it('toggles dictionary mode from false to true', () => {
      const state = reducer(initialState, toggleEditMode('dictionary'));
      expect(state.dictionary).toBe(true);
      expect(state.listen).toBe(false);
    });

    it('toggles dictionary mode from true to false', () => {
      const modifiedState: EditModeState = { listen: false, dictionary: true };
      const state = reducer(modifiedState, toggleEditMode('dictionary'));
      expect(state.dictionary).toBe(false);
      expect(state.listen).toBe(false);
    });

    it('does not affect other mode when toggling', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, toggleEditMode('dictionary'));
      expect(state.listen).toBe(true);
      expect(state.dictionary).toBe(true);
    });
  });

  describe('setEditMode', () => {
    it('enables listen mode', () => {
      const state = reducer(initialState, setEditMode({ type: 'listen', enabled: true }));
      expect(state.listen).toBe(true);
      expect(state.dictionary).toBe(false);
    });

    it('disables listen mode', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, setEditMode({ type: 'listen', enabled: false }));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(false);
    });

    it('enables dictionary mode', () => {
      const state = reducer(initialState, setEditMode({ type: 'dictionary', enabled: true }));
      expect(state.dictionary).toBe(true);
      expect(state.listen).toBe(false);
    });

    it('disables dictionary mode', () => {
      const modifiedState: EditModeState = { listen: false, dictionary: true };
      const state = reducer(modifiedState, setEditMode({ type: 'dictionary', enabled: false }));
      expect(state.dictionary).toBe(false);
      expect(state.listen).toBe(false);
    });

    it('does not affect other mode when setting', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, setEditMode({ type: 'dictionary', enabled: true }));
      expect(state.listen).toBe(true);
      expect(state.dictionary).toBe(true);
    });
  });

  describe('resetEditMode', () => {
    it('resets listen mode to false', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: false };
      const state = reducer(modifiedState, resetEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(false);
    });

    it('resets dictionary mode to false', () => {
      const modifiedState: EditModeState = { listen: false, dictionary: true };
      const state = reducer(modifiedState, resetEditMode('dictionary'));
      expect(state.dictionary).toBe(false);
      expect(state.listen).toBe(false);
    });

    it('does not affect other mode when resetting', () => {
      const modifiedState: EditModeState = { listen: true, dictionary: true };
      const state = reducer(modifiedState, resetEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(true);
    });

    it('is idempotent (resetting already false mode stays false)', () => {
      const state = reducer(initialState, resetEditMode('listen'));
      expect(state.listen).toBe(false);
      expect(state.dictionary).toBe(false);
    });
  });

  describe('complex state transitions', () => {
    it('handles multiple operations correctly', () => {
      let state = reducer(initialState, toggleEditMode('listen'));
      expect(state).toEqual({ listen: true, dictionary: false });

      state = reducer(state, toggleEditMode('dictionary'));
      expect(state).toEqual({ listen: true, dictionary: true });

      state = reducer(state, resetEditMode('listen'));
      expect(state).toEqual({ listen: false, dictionary: true });

      state = reducer(state, setEditMode({ type: 'listen', enabled: true }));
      expect(state).toEqual({ listen: true, dictionary: true });

      state = reducer(state, toggleEditMode('dictionary'));
      expect(state).toEqual({ listen: true, dictionary: false });
    });
  });
});
