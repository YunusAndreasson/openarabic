import { useAppSelector } from '@/store/hooks';
import { Colors, Theme } from '@/constants/Colors';

export function useColors() {
  const { theme, colors } = useAppSelector(state => state.theme);
  console.log('Current theme:', theme); // Temporary debug log
  console.log('Current colors from state:', colors); // Temporary debug log

  // Ensure we always return valid colors
  return colors || Colors[theme] || Colors.light;
}
