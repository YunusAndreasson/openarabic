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

    ...overrides,
  };

  if (isRegularScreen) {
    return baseOptions;
  }

  // Default is modal presentation with enhanced backdrop opacity
  return {
    presentation: 'modal',
    gestureEnabled: true,
    contentStyle: {
      backgroundColor: colors.background,
      // Subtle elevation for modal separation
      shadowColor: colors.shadow,
      ...LAYOUT.ELEVATION.MEDIUM,
    },
    ...baseOptions,
  };
}
