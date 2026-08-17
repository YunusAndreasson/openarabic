import { use } from 'react';
import { useColorScheme } from 'react-native';
import { ReactReduxContext } from 'react-redux';

import { Theme } from '@/constants/colors';
import { useAppSelectorShallow } from '@/store/hooks';

/**
 * The theme the app is currently painting in.
 *
 * The single resolution point: Redux when it is ready and has a theme, the
 * system scheme otherwise. `useColors` used to resolve this a second time with
 * its own fallback, and the two had drifted — with the store ready but
 * `theme.theme` unset (it is typed `Theme | null`, so redux-persist can rehydrate
 * one), `useColors` returned Dark while this returned the system scheme, leaving
 * the palette and every `useIsDarkMode()` branch disagreeing about the theme.
 *
 * @returns the current theme (light/dark/sepia)
 */
export function useCurrentTheme(): Theme {
  // Check if Redux context is available
  const reduxContext = use(ReactReduxContext);
  const systemColorScheme = useColorScheme();

  // Always call hooks unconditionally (React hooks rules)
  const reduxTheme = useAppSelectorShallow(state => state.theme.theme);

  // If Redux isn't ready or no theme set, use system color scheme as fallback
  if (!reduxContext?.store || !reduxTheme) {
    return systemColorScheme === 'dark' ? Theme.Dark : Theme.Light;
  }

  return reduxTheme;
}

/**
 * Enhanced hook for theme detection that combines Redux state with system preferences
 * Uses both manual theme setting and automatic system detection
 * Gracefully falls back to system colors when Redux isn't ready
 * @returns boolean indicating if the current theme is dark
 */
export function useIsDarkMode(): boolean {
  return useCurrentTheme() === Theme.Dark;
}
