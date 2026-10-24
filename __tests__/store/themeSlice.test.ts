/**
 * Store Tests
 *
 * Modern Jest 29 Patterns:
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import reducer, { selectTheme, setTheme, type ThemeState } from '../../store/themeSlice';
import { Theme } from '@/constants/colors';

describe('selectTheme', () => {
  test('a stored theme is read as stored', () => {
    expect(selectTheme({ theme: { theme: Theme.Light } })).toBe(Theme.Light);
  });

  test('a rehydrated null is the shipped default — the one fallback every reader shares', () => {
    expect(selectTheme({ theme: { theme: null } })).toBe(Theme.Dark);
  });
});

describe('themeSlice reducers', () => {
  let initialState: ThemeState;

  beforeEach(() => {
    initialState = {
      theme: Theme.Dark,
    };
  });

  describe('initial state', () => {
    test('defaults to Dark theme', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state.theme).toBe(Theme.Dark);
    });
  });

  describe('setTheme', () => {
    test('sets theme to Light', () => {
      const state = reducer(initialState, setTheme(Theme.Light));
      expect(state.theme).toBe(Theme.Light);
    });

    test('sets theme to Dark', () => {
      const lightState: ThemeState = { theme: Theme.Light };
      const state = reducer(lightState, setTheme(Theme.Dark));
      expect(state.theme).toBe(Theme.Dark);
    });

    test('sets theme to Sepia', () => {
      const state = reducer(initialState, setTheme(Theme.Sepia));
      expect(state.theme).toBe(Theme.Sepia);
    });

    test('is idempotent - setting same theme again', () => {
      const darkState: ThemeState = { theme: Theme.Dark };
      const state = reducer(darkState, setTheme(Theme.Dark));
      expect(state.theme).toBe(Theme.Dark);
    });

    test.each([Theme.Light, Theme.Dark, Theme.Sepia])('accepts valid theme value: %p', theme => {
      const state = reducer(initialState, setTheme(theme));
      expect(state.theme).toBe(theme);
    });
  });

  describe('theme transitions', () => {
    test('cycles through all themes', () => {
      let state = reducer(initialState, setTheme(Theme.Light));
      expect(state.theme).toBe(Theme.Light);

      state = reducer(state, setTheme(Theme.Sepia));
      expect(state.theme).toBe(Theme.Sepia);

      state = reducer(state, setTheme(Theme.Dark));
      expect(state.theme).toBe(Theme.Dark);
    });

    test('transitions from Light to each other theme', () => {
      const lightState: ThemeState = { theme: Theme.Light };

      let state = reducer(lightState, setTheme(Theme.Dark));
      expect(state.theme).toBe(Theme.Dark);

      state = reducer(lightState, setTheme(Theme.Sepia));
      expect(state.theme).toBe(Theme.Sepia);
    });

    test('transitions from Sepia to each other theme', () => {
      const sepiaState: ThemeState = { theme: Theme.Sepia };

      let state = reducer(sepiaState, setTheme(Theme.Light));
      expect(state.theme).toBe(Theme.Light);

      state = reducer(sepiaState, setTheme(Theme.Dark));
      expect(state.theme).toBe(Theme.Dark);
    });
  });

  describe('state immutability', () => {
    test('returns new state object on theme change', () => {
      const originalState: ThemeState = { theme: Theme.Dark };
      const newState = reducer(originalState, setTheme(Theme.Light));

      expect(newState).not.toBe(originalState);
      expect(newState.theme).toBe(Theme.Light);
      expect(originalState.theme).toBe(Theme.Dark);
    });
  });
});
