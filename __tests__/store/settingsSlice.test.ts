import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, { setFontScale, setShowEnglish } from '../../store/settingsSlice';

// Define the shape of the settings state
interface SettingsState {
  fontScale: number;
  showEnglish: boolean;
}

// Define the shape of the entire store
interface RootState {
  settings: SettingsState;
}

describe('settingsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        settings: settingsReducer,
      },
    });
  });

  describe('reducer', () => {
    it('should handle initial state', () => {
      // Verify initial state values
      const state = store.getState() as RootState;
      expect(state.settings.fontScale).toBe(1);
      expect(state.settings.showEnglish).toBe(true);
    });

    it('should handle setFontScale', () => {
      // Test with a common scale value
      store.dispatch(setFontScale(1.2));
      const state = store.getState() as RootState;
      expect(state.settings.fontScale).toBe(1.2);

      // Test with min value
      store.dispatch(setFontScale(0.5));
      expect((store.getState() as RootState).settings.fontScale).toBe(0.5);

      // Test with max value
      store.dispatch(setFontScale(2.0));
      expect((store.getState() as RootState).settings.fontScale).toBe(2.0);
    });

    it('should handle setShowEnglish', () => {
      // Initial state is true, toggle to false
      store.dispatch(setShowEnglish(false));
      const state = store.getState() as RootState;
      expect(state.settings.showEnglish).toBe(false);

      // Toggle back to true
      store.dispatch(setShowEnglish(true));
      expect((store.getState() as RootState).settings.showEnglish).toBe(true);
    });

    it('should maintain independent state properties', () => {
      // Change fontScale
      store.dispatch(setFontScale(1.5));
      const state = store.getState() as RootState;
      expect(state.settings.fontScale).toBe(1.5);
      expect(state.settings.showEnglish).toBe(true); // Should remain unchanged

      // Change showEnglish
      store.dispatch(setShowEnglish(false));
      const updatedState = store.getState() as RootState;
      expect(updatedState.settings.fontScale).toBe(1.5); // Should remain unchanged
      expect(updatedState.settings.showEnglish).toBe(false);
    });

    // Add a parameterized test for testing multiple settings
    it.each<{
      actionCreator: (payload: any) => any;
      value: number | boolean;
      expectedKey: keyof SettingsState;
      expectedValue: number | boolean;
    }>([
      { actionCreator: setFontScale, value: 1.2, expectedKey: 'fontScale', expectedValue: 1.2 },
      { actionCreator: setFontScale, value: 0.8, expectedKey: 'fontScale', expectedValue: 0.8 },
      {
        actionCreator: setShowEnglish,
        value: true,
        expectedKey: 'showEnglish',
        expectedValue: true,
      },
      {
        actionCreator: setShowEnglish,
        value: false,
        expectedKey: 'showEnglish',
        expectedValue: false,
      },
    ])(
      'should update $expectedKey to $expectedValue',
      ({ actionCreator, value, expectedKey, expectedValue }) => {
        // Dispatch the action with the value
        store.dispatch(actionCreator(value));

        // Get the updated state
        const updatedState = store.getState() as RootState;

        // Assert that the setting was updated correctly
        expect(updatedState.settings[expectedKey]).toEqual(expectedValue);
      }
    );
  });
});
