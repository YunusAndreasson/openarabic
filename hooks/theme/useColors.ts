import { Colors } from '@/constants/colors';
import { useCurrentTheme } from '@/hooks/theme/useThemeDetection';
import type { ThemeColors } from '@/types/ui/theme.types';

/**
 * Hook to get theme colors
 *
 * Colors are pre-computed from OKLCH at module load time, so this hook just
 * returns the static color object for the current theme. No caching or
 * memoization needed — Colors[theme] returns the same object reference.
 *
 * Theme resolution itself lives in `useCurrentTheme`, not here. This file used
 * to repeat it — same `use(ReactReduxContext)`, same `useColorScheme()`, its own
 * selector and its own fallback — and the two copies had already diverged on
 * what to do when the store is ready but no theme is set.
 */
export function useColors(): ThemeColors {
  return Colors[useCurrentTheme()];
}
