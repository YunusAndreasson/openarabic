import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';

import { handleError } from '@/utils/errorHandling';

import { useColors } from './useColors';

/**
 * Centralized system UI theme management
 * Automatically synchronizes root background with the app's current theme
 * Uses expo-system-ui for cross-platform background color management
 */
export function useSystemUITheme(): void {
  const colors = useColors();

  useEffect(() => {
    const updateSystemUI = async () => {
      try {
        // Set root background to match app theme
        // This ensures smooth transitions between app and system
        await SystemUI.setBackgroundColorAsync(colors.background);
      } catch (error) {
        // Silently handle system UI errors - not critical for app functionality
        handleError(error as Error, { showToast: false, captureSentry: false });
      }
    };

    updateSystemUI();
  }, [colors.background]);
}

/**
 * Get the current system UI background color
 * Useful for debugging or conditional styling
 */
export async function getSystemUIBackgroundColor(): Promise<ColorValue | null> {
  try {
    return await SystemUI.getBackgroundColorAsync();
  } catch (error) {
    handleError(error as Error, { showToast: false, captureSentry: false });
    return null;
  }
}
