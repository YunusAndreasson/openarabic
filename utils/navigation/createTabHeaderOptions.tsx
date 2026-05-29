import { Platform } from 'react-native';

import type { NativeStackNavigationOptions } from './navigationOptions';

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
 * Tab-root header options: native iOS large title that collapses to a small
 * centered title on scroll, with the nav bar background fading from transparent
 * to opaque as content slides under it (the iOS HIG Mail/Photos pattern).
 *
 * Recipe — all three are required:
 *   1. `headerLargeTitle: true` on the Stack.Screen.
 *   2. A native string `title` (NOT a custom `headerTitle` JSX — UIKit can't
 *      drive a collapse animation against a React Element).
 *   3. The screen's content scrollable sets
 *      `contentInsetAdjustmentBehavior="automatic"` and fills the screen.
 *
 * Why this helper does NOT go through `createNavigationOptions`:
 *   - createNavigationOptions sets `headerStyle: { backgroundColor }` for every
 *     screen. On iOS native-stack, that color is applied to BOTH
 *     standardAppearance and scrollEdgeAppearance, making the bar opaque in
 *     both states — which kills the scroll-edge fade. Tab roots leave it unset
 *     and rely on the React Navigation theme's `card` color (set in
 *     `app/_layout.tsx`'s navigationTheme) to color the standard appearance.
 *     scrollEdgeAppearance then stays at the iOS default (transparent) and the
 *     bar fades correctly.
 *   - createNavigationOptions also sets `scrollEdgeEffects: { top: 'soft' }`,
 *     which is an iOS 26 content-blur prop unrelated to the fade. Edenmind's
 *     reference implementation does not set it, so we don't either.
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
  colors: _colors,
}: TabHeaderOptions): NativeStackNavigationOptions {
  return {
    title,
    headerLargeTitle: Platform.OS === 'ios',
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    headerRight: rightComponent,
  };
}
