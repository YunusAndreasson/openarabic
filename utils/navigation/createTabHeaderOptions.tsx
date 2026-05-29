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
 * Tab-root header options: native iOS large title that collapses on scroll
 * (HIG-conforming), with a small inline title once the user scrolls past it.
 *
 * iOS large-title collapse requires:
 *   1. `headerLargeTitle: true` on the Stack.Screen
 *   2. a native `title` string (not the custom `headerTitle` JSX that
 *      `createNavigationOptions` would otherwise install — UIKit can't drive a
 *      collapsing animation against a React Element)
 *   3. a top-level scrollable in the route with
 *      `contentInsetAdjustmentBehavior="automatic"`
 *
 * Upstream Expo issue #40717 (NativeTabs > Stack > Screen swallowing the
 * collapse) was fixed in SDK 56; this used to be a known dead end pre-SDK 56.
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
    // Skip the custom left-aligned `headerTitle` JSX — the native large title
    // is already left-aligned (iOS HIG) and needs the string `title` to drive
    // the collapse-on-scroll animation. The inline title after collapse is
    // centered on iOS, matching system tab roots (Mail, Photos, etc.).
    useNativeTitle: true,
    title,
    headerLargeTitle: Platform.OS === 'ios',
    headerRight: rightComponent,
    // Tab roots sit above the tab bar / iOS 26 bottom accessory; explicitly
    // hide the bottom edge effect to avoid artifacts where scroll content
    // meets that chrome. Only relevant on iOS 26+.
    ...(Platform.OS === 'ios' && {
      scrollEdgeEffects: { top: 'soft', bottom: 'hidden' },
    }),
  });
}
