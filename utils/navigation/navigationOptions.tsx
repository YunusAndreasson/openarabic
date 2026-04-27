import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform, Text, View } from 'react-native';

import { FONTS } from '@/constants/fonts';

// UIKit nav bar title is 17pt semibold; M3 small top app bar is 22pt.
const NATIVE_TITLE_FONT_SIZE = Platform.OS === 'ios' ? 17 : 22;

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

  const baseOptions: NativeStackNavigationOptions = {
    headerStyle: { backgroundColor: colors.background },
    // iOS 26+: soft blur cutoff at the top edge of scroll content as it passes
    // under the nav bar. Modals are full-screen so bottom is left at the
    // platform default; tab roots opt into `bottom: 'hidden'` themselves to
    // avoid artifacts above the tab bar / bottom accessory.
    // No-op on iOS <26 and Android.
    ...(Platform.OS === 'ios' && {
      scrollEdgeEffects: { top: 'soft' },
    }),
    // Force left-aligned title on both platforms. UIKit centers nav bar titles
    // and ignores `headerTitleAlign`, so we render via custom `headerTitle` at
    // native sizes (17pt iOS / 22pt Android) wrapped in a flex:1 View.
    ...(title
      ? {
          headerTitle: () => (
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: colors.headingText,
                  fontFamily: FONTS.ENGLISH_SEMIBOLD,
                  fontSize: NATIVE_TITLE_FONT_SIZE,
                }}
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
