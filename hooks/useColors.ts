import { Colors, ColorName } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

export function useColors() {
  const { theme } = useTheme();

  // Create a proxy object that automatically returns the correct color for the current theme
  const colors = new Proxy({} as Record<ColorName, string>, {
    get: (_, colorName: ColorName) => {
      const color = Colors[theme][colorName];

      return color;
    },
  });

  return colors;
}
