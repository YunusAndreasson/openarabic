import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { FONT_WEIGHTS, LAYOUT } from '@/constants/layout';

/**
 * Centralized navigation configuration for consistent styling across the app
 * Uses native header elements to enable iOS 26 liquid glass effects
 *
 * @example Modal screen (default)
 * <Stack.Screen name="example" options={createNavigationOptions(colors, { title: 'Example' })} />
 *
 * @example Regular screen
 * <Stack.Screen name="settings" options={createNavigationOptions(colors, { title: 'Settings', isRegularScreen: true })} />
 */

/**
 * Universal navigation options for all screens and modals
 * Defaults to modal presentation with native header elements for iOS glass effects
 */
export function createNavigationOptions(
  colors: {
    background: string;
    headingText: string;
    shadow: string;
  },
  options: {
    isRegularScreen?: boolean;
  } & Partial<NativeStackNavigationOptions> = {},
): NativeStackNavigationOptions {
  const { isRegularScreen, ...overrides } = options;

  // Use native header elements to enable iOS 26 liquid glass
  const baseOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerTitleStyle: {
      color: colors.headingText,
      fontWeight: FONT_WEIGHTS.SEMIBOLD,
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    },
    headerTintColor: colors.headingText,
    headerBackVisible: false, // Prevent default back button on Android when using custom headerLeft
    headerShadowVisible: false,
    ...overrides,
  };

  if (isRegularScreen) {
    return baseOptions;
  }

  // Native modal behavior - unified across platforms with glass support
  return {
    presentation: 'modal',
    animation: 'slide_from_bottom', // Android: Slide up from bottom like iOS
    gestureEnabled: true,
    fullScreenGestureEnabled: true, // iOS: Allow full-screen swipe to dismiss
    contentStyle: {
      backgroundColor: colors.background,
    },
    ...baseOptions,
  };
}
