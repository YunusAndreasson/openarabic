import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import { setTheme } from '@/store/themeSlice';
import { Theme } from '@/constants/Colors';
import { useCallback, memo, useRef } from 'react';
import { Toggle } from './Toggle';

function ThemeToggleComponent() {
  const dispatch = useAppDispatch();
  const theme = useAppSelectorMemo(state => state.theme.theme);

  const handleValueChange = useCallback(
    (isDark: boolean) => {
      dispatch(setTheme(isDark ? Theme.Dark : Theme.Light));
    },
    [dispatch]
  );

  return <Toggle value={theme === Theme.Dark} onValueChange={handleValueChange} />;
}

// Memoize the component to prevent unnecessary rerenders
export const ThemeToggle = memo(ThemeToggleComponent);
