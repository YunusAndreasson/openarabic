import { Theme } from '@/constants/Colors';
import { useAppSelectorMemo } from '@/store/hooks';

/**
 * A hook to consistently detect if the current theme is dark mode
 * Uses Redux theme state only without fallbacks
 * @returns boolean indicating if the current theme is dark
 */
export function useIsDarkMode(): boolean {
  // Get theme from Redux store
  const theme = useAppSelectorMemo(state => state.theme.theme);

  // Return whether the theme is dark
  return theme === Theme.Dark;
}
