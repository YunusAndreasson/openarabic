import { useAppSelector } from '@/store/hooks';
import { Colors, Theme } from '@/constants/Colors';

export function useColors() {
  const { theme } = useAppSelector(state => state.theme);
  return Colors[theme ?? Theme.Light];
}
