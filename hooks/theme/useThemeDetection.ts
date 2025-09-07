import { useColorScheme } from 'react-native';

import { Theme } from '@/constants/colors';
import { useAppSelectorMemo } from '@/store/hooks';

/**
 * Enhanced hook for theme detection that combines Redux state with system preferences
 * Uses both manual theme setting and automatic system detection
 * @returns boolean indicating if the current theme is dark
 */
export function useIsDarkMode(): boolean {
  // Get theme from Redux store with error handling for missing context
  const theme = useAppSelectorMemo(state => state?.theme?.theme);

  // Get system color scheme preference
  const systemColorScheme = useColorScheme();

  // If no theme is set in Redux, fall back to system preference
  if (!theme) {
    return systemColorScheme === 'dark';
  }

  // Return whether the theme is dark
  return theme === Theme.Dark;
}

/**
 * Hook to get the current theme enum
 * @returns the current theme (light/dark/sepia)
 */
export function useCurrentTheme(): Theme {
  // Get theme from Redux store with error handling for missing context
  const theme = useAppSelectorMemo(state => state?.theme?.theme);

  // Return theme or fallback to dark (Midnight Summer) - consistent with initial state
  return theme || Theme.Dark;
}
