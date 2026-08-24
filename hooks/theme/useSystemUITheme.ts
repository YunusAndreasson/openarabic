import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';

/**
 * Centralized system UI theme management
 * Automatically synchronizes root background with the app's current theme
 * Uses expo-system-ui for cross-platform background color management
 * Note: On Android with edge-to-edge mode, this is a no-op as the API is not supported
 */
export function useSystemUITheme(): void {
  const colors = useColors();

  useEffect(() => {
    // Skip on Android - setBackgroundColorAsync not supported with edge-to-edge mode
    if (Platform.OS === 'android') return;

    const updateSystemUI = async () => {
      try {
        // Set root background to match app theme (iOS only)
        // This ensures smooth transitions between app and system
        await SystemUI.setBackgroundColorAsync(colors.background);
      } catch (error) {
        // Silently handle system UI errors - not critical for app functionality
        void handleError(error, { showToast: false, captureSentry: false });
      }
    };

    void updateSystemUI();
  }, [colors.background]);
}
