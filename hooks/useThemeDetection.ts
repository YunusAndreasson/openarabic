import { useColors } from './useColors';
import { Colors, Theme } from '../constants/Colors';

/**
 * A hook to consistently detect if the current theme is dark mode
 * @returns boolean indicating if the current theme is dark
 */
export function useIsDarkMode(): boolean {
  const colors = useColors();
  return colors.background === Colors.dark.background;
}
