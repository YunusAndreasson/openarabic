import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform, Text, View } from 'react-native';

import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';

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
    /**
     * When true, leave the title as a plain string so UIKit / Material can
     * render it natively. Required for iOS `headerLargeTitle` collapse-on-scroll
     * (UIKit can't animate a custom React element). Defaults to false, which
     * keeps the left-aligned custom JSX title used everywhere else.
     */
    useNativeTitle?: boolean;
  } & Partial<NativeStackNavigationOptions> = {},
): NativeStackNavigationOptions {
  const { isRegularScreen, useNativeTitle, title, ...restOverrides } = options;

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
    // Tab roots opt out via `useNativeTitle` so iOS can drive the large-title
    // collapse animation against a real UILabel.
    ...(title
      ? useNativeTitle
        ? { title }
        : {
            title,
            // `children ?? title`, not `title`: React Navigation passes the
            // RESOLVED title in as `children`, so reading the closed-over one
            // made `navigation.setOptions({ title })` from a screen a no-op —
            // which is why the word detail's header said the literal word
            // "Word" above whichever word you had opened. Identical output for
            // every screen that never overrides it, since `children` is then
            // just `options.title`.
            headerTitle: ({ children }: { children?: string }) => (
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.headingText,
                    fontFamily: FONTS.ENGLISH_SEMIBOLD,
                    fontSize: NATIVE_TITLE_FONT_SIZE,
                  }}
                >
                  {children ?? title}
                </Text>
              </View>
            ),
          }
      : {}),
    headerTintColor: colors.headingText,
    headerBackButtonDisplayMode: 'minimal', // iOS: show only back chevron, no title text
    headerShadowVisible: false,
    ...restOverrides,
  };

  // A pushed screen keeps whatever back affordance the platform provides.
  // `headerBackVisible: false` used to be set for every screen to suppress
  // Android's default button "when using custom headerLeft" — but no screen in
  // the app supplies a headerLeft, so it only ever stripped the chevron off
  // pushed screens. The practice word detail was left with no visible way out
  // at all (no back, no close); you had to know the system back gesture.
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
    // A modal is dismissed by its CloseButton, not a chevron. Without this a
    // modal opened over a tab root shows both, which reads as two different
    // ways out that do different things.
    headerBackVisible: false,
    contentStyle: {
      backgroundColor: colors.background,
    },
    ...baseOptions,
  };
}

/**
 * A bottom form sheet.
 *
 * Five screens declared this same block by hand and four of them were
 * byte-identical; only `sheetAllowedDetents` ever differed.
 *
 * `'fitToContents'` measures the screen's content wrapper and re-measures it
 * whenever the content height changes, so an async chart resizes the sheet
 * instead of being clipped by a guessed fraction. Content must therefore stay
 * measurable — no `flex: 1` child (nothing to measure) and no ScrollView (which
 * iOS resizes to the whole screen view, see `SheetScreen`). A sheet whose
 * content cannot fit, such as a long list, must pass explicit detents instead.
 *
 * `contentStyle` carries the sheet background rather than the content view, and
 * is NOT optional: with `fitToContents` and a hidden header iOS leaves a bottom
 * safe-area inset below the content wrapper (react-native-screens#3203), and
 * only the Screen can paint it — react-native-screens lifts this
 * `backgroundColor` onto it for exactly that reason. Painting `elevation1`
 * further in left that band on Expo Router's injected theme `background`: the
 * gap at the bottom.
 */
export function createSheetOptions(
  colors: { elevation1: string },
  sheetAllowedDetents: NativeStackNavigationOptions['sheetAllowedDetents'] = 'fitToContents',
): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    sheetAllowedDetents,
    contentStyle: { backgroundColor: colors.elevation1 },
    sheetGrabberVisible: true,
    sheetCornerRadius: LAYOUT.BORDER_RADIUS.SHEET,
    headerShown: false,
  };
}
