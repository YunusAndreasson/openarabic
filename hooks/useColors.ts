import { useAppSelector } from '@/store/hooks';
import { Colors, Theme } from '@/constants/Colors';

export function useColors() {
  const { theme } = useAppSelector(state => state.theme);

  // Always return the colors from the current theme state
  return Colors[theme ?? Theme.Light];
}
