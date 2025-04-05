import { useMemo } from 'react';

import { Colors, Theme } from '@/constants/Colors';
import { useAppSelectorMemo } from '@/store/hooks';
import type { ThemeColors } from '@/types/ui/theme.types';

export function useColors(): ThemeColors {
  // Use the memoized selector to prevent unnecessary rerenders
  const theme = useAppSelectorMemo(state => state.theme.theme);

  // Memoize the colors object to prevent unnecessary rerenders
  return useMemo(() => Colors[theme ?? Theme.Light], [theme]);
}
