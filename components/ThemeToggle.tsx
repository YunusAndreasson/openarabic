import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme } from '@/store/themeSlice';
import { Theme } from '@/constants/Colors';
import { useCallback } from 'react';
import { Toggle } from './Toggle';

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);

  const handleValueChange = useCallback(
    (isDark: boolean) => {
      dispatch(setTheme(isDark ? Theme.Dark : Theme.Light));
    },
    [dispatch]
  );

  return <Toggle value={theme === Theme.Dark} onValueChange={handleValueChange} />;
}
