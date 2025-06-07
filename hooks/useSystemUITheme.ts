import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';

import { useColors } from './useColors';
import { useIsDarkMode } from './useThemeDetection';

/**
 * Centralized system UI theme management
 * Automatically synchronizes root background with the app's current theme
 * Uses expo-system-ui for cross-platform background color management
 */
export function useSystemUITheme() {
  const colors = useColors();
  const isDark = useIsDarkMode();

  useEffect(() => {
    const updateSystemUI = async () => {
      try {
        // Set root background to match app theme
        // This ensures smooth transitions between app and system
        await SystemUI.setBackgroundColorAsync(colors.background);
      } catch (error) {
        // Silently handle system UI errors - not critical for app functionality
        console.warn('System UI background color update failed:', error);
      }
    };

    updateSystemUI();
  }, [colors.background, isDark]);
}

/**
 * Get the current system UI background color
 * Useful for debugging or conditional styling
 */
export async function getSystemUIBackgroundColor(): Promise<ColorValue | null> {
  try {
    return await SystemUI.getBackgroundColorAsync();
  } catch (error) {
    console.warn('Failed to get system UI background color:', error);
    return null;
  }
}
