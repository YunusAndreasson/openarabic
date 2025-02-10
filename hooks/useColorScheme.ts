import { useColorScheme as useNativeColorScheme } from 'react-native';
import { Theme } from '@/constants/Colors';

export function useColorScheme() {
  const colorScheme = useNativeColorScheme();

  // Ensure we always return 'light' or 'dark'
  return colorScheme ?? Theme.Light;
}
