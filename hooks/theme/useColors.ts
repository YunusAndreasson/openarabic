import { use } from 'react';
import { useColorScheme } from 'react-native';
import { ReactReduxContext } from 'react-redux';

import { Colors, Theme } from '@/constants/colors';
import { useAppSelector } from '@/store/hooks';
import type { ThemeColors } from '@/types/ui/theme.types';

/**
 * Hook to get theme colors
 *
 * Colors are pre-computed from OKLCH at module load time, so this hook
 * just returns the static color object for the current theme.
 * No caching or memoization needed - Colors[theme] returns the same object reference.
 */
export function useColors(): ThemeColors {
  // Check if Redux context is available (handles state migration timing issues)
  const reduxContext = use(ReactReduxContext);
  const systemColorScheme = useColorScheme();

  // Always call hooks unconditionally (React hooks rules)
  const reduxTheme = useAppSelector(
    state => state.theme.theme || Theme.Dark,
    (prev, next) => prev === next,
  );

  // If Redux isn't ready, use system color scheme as fallback
  if (!reduxContext?.store) {
    const fallbackTheme = systemColorScheme === 'dark' ? Theme.Dark : Theme.Light;
    return Colors[fallbackTheme];
  }

  // Colors[theme] returns the same stable object reference every time
  return Colors[reduxTheme];
}
