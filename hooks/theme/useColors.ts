import { useRef } from 'react';

import { Colors, Theme } from '@/constants/colors';
import { useAppSelector } from '@/store/hooks';
import type { ThemeColors } from '@/types/ui/theme.types';

// Cache the colors objects at module level to ensure stable references
const COLOR_CACHE = new Map<string, ThemeColors>();

function getCachedColors(theme: Theme): ThemeColors {
  const cacheKey = theme;
  if (!COLOR_CACHE.has(cacheKey)) {
    COLOR_CACHE.set(cacheKey, Colors[theme]);
  }
  const cached = COLOR_CACHE.get(cacheKey);
  if (!cached) {
    throw new Error(`Failed to get cached colors for theme: ${theme}`);
  }
  return cached;
}

export function useColors(): ThemeColors {
  // Use ref to track previous theme and colors - must be at top level
  const prevThemeRef = useRef<Theme | null>(null);
  const prevColorsRef = useRef<ThemeColors | null>(null);

  try {
    const theme = useAppSelector(
      state => state?.theme?.theme || Theme.Dark,
      (prev, next) => prev === next
    );

    // Only recompute colors when theme actually changes
    if (prevThemeRef.current !== theme) {
      prevThemeRef.current = theme;
      prevColorsRef.current = getCachedColors(theme);
    }

    // Ensure we always return a valid colors object
    if (!prevColorsRef.current) {
      prevColorsRef.current = getCachedColors(theme);
    }

    return prevColorsRef.current;
  } catch {
    // Fallback to dark theme (Midnight Summer) if Redux context is not available yet
    // This prevents errors during initial app bootstrap and matches default theme
    return getCachedColors(Theme.Dark);
  }
}
