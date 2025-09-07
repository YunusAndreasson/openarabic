import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

import { LAYOUT } from '@/constants/layout';

/**
 * Centralized navigation configuration for consistent styling across the app
 *
 * @example Modal screen (default)
 * <Stack.Screen name="example" options={createNavigationOptions(colors, { title: 'Example' })} />
 *
 * @example Regular screen
 * <Stack.Screen name="settings" options={createNavigationOptions(colors, { title: 'Settings', isRegularScreen: true })} />
 */

/**
 * Universal navigation options for all screens and modals
 * Defaults to modal presentation with enhanced backdrop for better focus
 */
export function createNavigationOptions(
  colors: {
    background: string;
    headingText: string;
    shadow: string;
  },
  options: {
    isRegularScreen?: boolean;
  } & Partial<NativeStackNavigationOptions> = {}
): NativeStackNavigationOptions {
  const { isRegularScreen, ...overrides } = options;

  const baseOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerTitleStyle: {
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
      fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight,
    },
    headerTintColor: colors.headingText,
    headerTransparent: false,
    ...overrides,
  };

  if (isRegularScreen) {
    return baseOptions;
  }

  // Native modal behavior (minimal customization)
  return {
    presentation: Platform.select({
      ios: 'modal',
      android: 'fullScreenModal',
      default: 'modal',
    }),
    gestureEnabled: true,
    contentStyle: {
      backgroundColor: colors.background,
    },
    ...baseOptions,
  };
}
