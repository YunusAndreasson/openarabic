import { Button } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleTheme } from '../store/themeSlice';

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector(state => state.theme.isDark);

  return (
    <Button
      onPress={() => dispatch(toggleTheme())}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
    />
  );
}
