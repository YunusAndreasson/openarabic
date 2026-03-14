import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform, Text, View } from 'react-native';

import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';

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
  const { isRegularScreen, title, ...restOverrides } = options;

  // Use native header elements to enable iOS 26 liquid glass
  const baseOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    ...(Platform.OS === 'android' && { headerTitleAlign: 'left' }),
    // Custom headerTitle for left-aligned large title on both platforms
    ...(title
      ? {
          headerTitle: () => (
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text
                style={{
                  color: colors.headingText,
                  fontFamily: FONTS.ENGLISH_BOLD,
                  fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
          ),
        }
      : {}),
    headerTintColor: colors.headingText,
    headerBackVisible: false, // Prevent default back button on Android when using custom headerLeft
    headerBackButtonDisplayMode: 'minimal', // iOS: show only back chevron, no title text
    headerShadowVisible: false,
    ...restOverrides,
  };

  if (isRegularScreen) {
    return baseOptions;
  }

  // Native modal behavior - unified across platforms with glass support
  return {
    presentation: 'modal', // Standard modal with backdrop
    animation: 'slide_from_bottom', // Android: Slide up from bottom like iOS
    gestureEnabled: true,
    fullScreenGestureEnabled: true, // iOS: Allow full-screen swipe to dismiss
    animationMatchesGesture: true, // iOS: Sync swipe gesture with slide animation
    contentStyle: {
      backgroundColor: colors.background,
    },
    ...baseOptions,
  };
}
