import { Platform } from 'react-native';

import { createNavigationOptions, type NativeStackNavigationOptions } from './navigationOptions';

interface TabHeaderOptions {
  readonly title: string;
  readonly rightComponent?: () => React.ReactElement;
  readonly colors: {
    background: string;
    headingText: string;
    shadow: string;
  };
}

/**
 * Creates consistent header options for tab screens
 * Thin wrapper around createNavigationOptions with isRegularScreen: true
 *
 * @example
 * <Stack.Screen
 *   name="index"
 *   options={createTabHeaderOptions({
 *     title: AppTab.PLAYLIST,
 *     rightComponent: () => <EditModeButton />,
 *     colors,
 *   })}
 * />
 */
export function createTabHeaderOptions({
  title,
  rightComponent,
  colors,
}: TabHeaderOptions): NativeStackNavigationOptions {
  return createNavigationOptions(colors, {
    isRegularScreen: true,
    title,
    headerRight: rightComponent,
    // Tab roots sit above the tab bar / iOS 26 bottom accessory; explicitly
    // hide the bottom edge effect to avoid artifacts where scroll content
    // meets that chrome. Only relevant on iOS 26+.
    ...(Platform.OS === 'ios' && {
      scrollEdgeEffects: { top: 'soft', bottom: 'hidden' },
    }),
  });
}
