import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme() {
  const colorScheme = useNativeColorScheme();

  // Ensure we always return 'light' or 'dark'
  return colorScheme ?? 'light';
}
