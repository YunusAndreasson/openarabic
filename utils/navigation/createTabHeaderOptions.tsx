import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface TabHeaderOptions {
  readonly title: string;
  /**
   * The tab's own tools — edit, dictionary.
   *
   * Named for where it lands on iOS, which is the leading slot: that is where a
   * left-to-right reader looks first, and the trailing slot is reserved for the
   * one action the screen exists to start.
   *
   * ON ANDROID IT IS RENDERED TRAILING INSTEAD, next to `rightComponent`. A
   * Material top app bar reserves its leading slot for *navigation* — the back
   * arrow or the menu — and puts every action after the title. An icon button
   * placed leading there does not read as a button at all: it sits flush
   * against the title and reads as an ornament on the word ("📖 Practice",
   * "✏️ Playlist"). Actions belong trailing on Android; the prop name follows
   * the iOS layout because that is the one it matches literally.
   */
  readonly leftComponent?: () => React.ReactElement;
  /** The screen's primary action, as text (`Play all`, `Review`). */
  readonly rightComponent?: () => React.ReactElement;
}

const styles = StyleSheet.create({
  /** Android's trailing action group: tools first, primary action outermost. */
  androidActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
});

/**
 * Tab-root header options: native iOS large title that collapses to a small
 * centered title on scroll, with the nav bar background fading from transparent
 * to opaque as content slides under it (the iOS HIG Mail/Photos pattern).
 *
 * iOS 26+: Expo Router (SDK 58) gives a header with no `headerStyle.backgroundColor`
 * the system appearance — a transparent Liquid Glass bar that content scrolls
 * under — so these tab roots get glass there and the fade below applies to
 * iOS < 26 only. The recipe is unchanged either way: the automatic content
 * inset is what keeps the first row out from under the glass.
 *
 * Recipe — all three are required:
 *   1. `headerLargeTitleEnabled: true` on the Stack.Screen.
 *   2. A native string `title` (NOT a custom `headerTitle` JSX — UIKit can't
 *      drive a collapse animation against a React Element).
 *   3. The screen's content scrollable sets
 *      `contentInsetAdjustmentBehavior="automatic"`, fills the screen, and sits
 *      at the TOP of the screen's tree — a fragment sibling is fine, a wrapping
 *      View is not. UIKit finds the scroll view that drives the collapse with a
 *      shallow search of the view controller, so burying it under even one or
 *      two native views silently costs the animation and nothing else: the bar
 *      still fades, the title just never shrinks. Account shipped that way
 *      (SafeAreaView > View > ScrollView) and was the one tab whose large title
 *      stayed large.
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
 *     leftComponent: () => <EditModeButton />,
 *     rightComponent: () => <PlayAllButton />,
 *   })}
 * />
 */
export function createTabHeaderOptions({
  title,
  leftComponent,
  rightComponent,
}: TabHeaderOptions): NativeStackNavigationOptions {
  const base: NativeStackNavigationOptions = {
    title,
    headerLargeTitleEnabled: Platform.OS === 'ios',
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  };

  // iOS: tools lead, the primary action trails — see `leftComponent`.
  if (Platform.OS !== 'android') {
    return { ...base, headerLeft: leftComponent, headerRight: rightComponent };
  }

  // Android: everything trails. Tools sit inboard of the primary action, so
  // `Review` and `Play all` stay exactly where they already are and the icon
  // joins them from the left rather than displacing them.
  if (!leftComponent) {
    return { ...base, headerRight: rightComponent };
  }

  const Tools = leftComponent;
  const Primary = rightComponent;

  return {
    ...base,
    headerRight: () => (
      <View style={styles.androidActions}>
        <Tools />
        {Primary ? <Primary /> : null}
      </View>
    ),
  };
}
