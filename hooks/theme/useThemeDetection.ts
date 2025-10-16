import { useContext } from 'react';
import { useColorScheme } from 'react-native';
import { ReactReduxContext } from 'react-redux';

import { Theme } from '@/constants/colors';
import { useAppSelectorShallow } from '@/store/hooks';

/**
 * Enhanced hook for theme detection that combines Redux state with system preferences
 * Uses both manual theme setting and automatic system detection
 * Gracefully falls back to system colors when Redux isn't ready
 * @returns boolean indicating if the current theme is dark
 */
export function useIsDarkMode(): boolean {
  // Check if Redux context is available
  const reduxContext = useContext(ReactReduxContext);
  const systemColorScheme = useColorScheme();

  // Always call hooks unconditionally (React hooks rules)
  const reduxTheme = useAppSelectorShallow(state => state.theme.theme);

  // If Redux isn't ready, use system color scheme as fallback
  if (!reduxContext?.store) {
    return systemColorScheme === 'dark';
  }

  // If no theme is set in Redux, fall back to system preference
  if (!reduxTheme) {
    return systemColorScheme === 'dark';
  }

  // Return whether the theme is dark
  return reduxTheme === Theme.Dark;
}

/**
 * Hook to get the current theme enum
 * Gracefully falls back to system colors when Redux isn't ready
 * @returns the current theme (light/dark/sepia)
 */
export function useCurrentTheme(): Theme {
  // Check if Redux context is available
  const reduxContext = useContext(ReactReduxContext);
  const systemColorScheme = useColorScheme();

  // Always call hooks unconditionally (React hooks rules)
  const reduxTheme = useAppSelectorShallow(state => state.theme.theme);

  // If Redux isn't ready, use system color scheme as fallback
  if (!reduxContext?.store) {
    return systemColorScheme === 'dark' ? Theme.Dark : Theme.Light;
  }

  // Return theme or fallback to dark (Midnight Summer) - consistent with initial state
  return reduxTheme || Theme.Dark;
}
