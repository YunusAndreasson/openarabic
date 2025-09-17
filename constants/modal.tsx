import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform, Text, View } from 'react-native';

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
    headerTintColor: colors.headingText,
    headerTransparent: false,
    ...overrides,
  };

  // Create custom header component to avoid menu item styling entirely
  if (overrides.title && typeof overrides.title === 'string') {
    baseOptions.headerTitle = () => (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 0,
        }}
      >
        {/* Left side - headerLeft if exists */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flex: 1,
          }}
        >
          {overrides.headerLeft &&
            (typeof overrides.headerLeft === 'function'
              ? overrides.headerLeft({})
              : overrides.headerLeft)}
        </View>

        {/* Center - title */}
        <View
          style={{
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
              fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight,
              color: colors.headingText,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {overrides.title}
          </Text>
        </View>

        {/* Right side - headerRight if exists */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flex: 1,
          }}
        >
          {overrides.headerRight &&
            (typeof overrides.headerRight === 'function'
              ? overrides.headerRight({})
              : overrides.headerRight)}
        </View>
      </View>
    );

    // Remove the original properties to avoid conflicts
    delete baseOptions.title;
    delete baseOptions.headerLeft;
    delete baseOptions.headerRight;
  }

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
