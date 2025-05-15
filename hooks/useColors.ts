import { useMemo } from 'react';

import { Colors, Theme } from '@/constants/Colors';
import { useAppSelector } from '@/store/hooks';
import type { ThemeColors } from '@/types/ui/theme.types';

export function useColors(): ThemeColors {
  // Use the selector with shallowEqual comparison to prevent unnecessary rerenders
  const theme = useAppSelector(
    state => state.theme.theme,
    (prev, next) => prev === next
  );

  // Memoize the colors object to prevent unnecessary rerenders
  return useMemo(() => Colors[theme ?? Theme.Light], [theme]);
}
