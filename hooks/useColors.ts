import { useAppSelector } from '@/store/hooks';

export function useColors() {
  const { colors } = useAppSelector(state => state.theme);
  return colors;
}
