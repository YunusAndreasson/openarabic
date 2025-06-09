import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { LAYOUT } from './layout';

/**
 * Centralized navigation configuration for consistent styling across the app
 *
 * @example Modal screen (default)
 * ```typescript
 * <Stack.Screen
 *   name="example"
 *   options={createNavigationOptions(colors, { title: 'Example' })}
 * />
 * ```
 *
 * @example Regular screen
 * ```typescript
 * <Stack.Screen
 *   name="settings"
 *   options={createNavigationOptions(colors, { title: 'Settings', isRegularScreen: true })}
 * />
 * ```
 */

/**
 * Universal navigation options for all screens and modals
 * Defaults to modal presentation since this is primarily a modal system
 */
export function createNavigationOptions(
  colors: {
    background: string;
    headingText: string;
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
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    },
    headerTintColor: colors.headingText,

    ...overrides,
  };

  if (isRegularScreen) {
    return baseOptions;
  }

  // Default is modal presentation
  return {
    presentation: 'modal',
    gestureEnabled: true,
    ...baseOptions,
  };
}
