import { useAppSelectorMemo } from '@/store/hooks';
import { Colors, Theme } from '@/constants/Colors';
import { useMemo } from 'react';

export function useColors() {
  // Use the memoized selector to prevent unnecessary rerenders
  const theme = useAppSelectorMemo(state => state.theme.theme);

  // Memoize the colors object to prevent unnecessary rerenders
  return useMemo(() => Colors[theme ?? Theme.Light], [theme]);
}
