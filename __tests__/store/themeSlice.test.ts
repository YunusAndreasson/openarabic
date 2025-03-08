import { configureStore } from '@reduxjs/toolkit';
import themeReducer, { setTheme } from '../../store/themeSlice';
import { Theme, Colors } from '../../constants/Colors';

const createThemeStore = (initialState = undefined) =>
  configureStore({
    reducer: { theme: themeReducer },
    preloadedState: initialState ? { theme: initialState } : undefined,
  });

describe('themeSlice', () => {
  describe('reducer', () => {
    it('should handle initial state', () => {
      const store = createThemeStore();
      const state = store.getState().theme;

      // The default state should have initial values
      expect(state.theme).toBe(null);
      expect(state.colors).toEqual(Colors.light);
    });

    it('should handle setTheme action with light theme', () => {
      const store = createThemeStore();

      // Set to light theme
      store.dispatch(setTheme(Theme.Light));

      // Check the result
      const state = store.getState().theme;
      expect(state.theme).toBe(Theme.Light);
      expect(state.colors).toEqual(Colors.light);
    });

    it('should handle setTheme action with dark theme', () => {
      const store = createThemeStore();

      // Set to dark theme
      store.dispatch(setTheme(Theme.Dark));

      // Check the result
      const state = store.getState().theme;
      expect(state.theme).toBe(Theme.Dark);
      expect(state.colors).toEqual(Colors.dark);
    });

    it('should update colors when theme changes', () => {
      const store = createThemeStore();

      // Set to light theme
      store.dispatch(setTheme(Theme.Light));
      expect(store.getState().theme.colors).toEqual(Colors.light);

      // Change to dark theme
      store.dispatch(setTheme(Theme.Dark));
      expect(store.getState().theme.colors).toEqual(Colors.dark);

      // Change back to light theme
      store.dispatch(setTheme(Theme.Light));
      expect(store.getState().theme.colors).toEqual(Colors.light);
    });
  });
});
