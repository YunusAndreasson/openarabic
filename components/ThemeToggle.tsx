import { Button } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme } from '@/store/themeSlice';
import { Theme } from '@/constants/Colors';

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);

  return (
    <Button
      onPress={() => dispatch(setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark))}
      title={`Switch to ${theme === Theme.Dark ? 'Light' : 'Dark'} Theme`}
    />
  );
}
