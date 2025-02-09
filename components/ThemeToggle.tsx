import { Button } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme } from '@/store/themeSlice';

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);

  return (
    <Button
      onPress={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
    />
  );
}
