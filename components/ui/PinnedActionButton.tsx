import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import type { JSX } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';

interface PinnedActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
}

/**
 * Where the pinned button's bottom edge sits, in points.
 *
 * Shared by the button itself and by `usePinnedActionClearance` so the space a
 * screen reserves and the space the button occupies are derived from one
 * formula and cannot drift apart.
 */
function usePinnedActionBottom(): number {
  const insets = useSafeAreaInsets();
  const shouldShowMiniPlayer = useShouldShowMiniPlayer();
  const miniPlayerClearance = shouldShowMiniPlayer
    ? LAYOUT.CARD.HEIGHT.MINI_PLAYER + LAYOUT.SPACING.SMALL
    : 0;

  // This button lives INSIDE a NativeTabs screen, whose content area already
  // ends flush above the native tab bar — the tab bar is separate native
  // chrome, not part of this view's own layout. On Android, `insets.bottom`
  // still reports the raw gesture-nav inset even here (confirmed on-device:
  // 24dp), even though that strip sits below chrome this view never reaches,
  // so adding it double-counts clearance the tab bar already owns and leaves
  // a large dead gap above it (measured ~32dp / ~84px on a 2.625x-density
  // device). iOS's UITabBarController-hosted content reads correctly with
  // the unmodified formula, so only Android needs the exclusion.
  const bottomInsetClearance = Platform.OS === 'android' ? 0 : insets.bottom;
  return bottomInsetClearance + LAYOUT.SPACING.SMALL + miniPlayerClearance;
}

/**
 * Bottom content padding a screen must reserve so nothing hides behind the
 * pinned CTA. Use this for `contentContainerStyle.paddingBottom`.
 *
 * Screens used to hardcode `BUTTON.HEIGHT.LARGE + SPACING.XLARGE`, which
 * ignored both the safe-area inset and the mini player. With the mini player
 * up the button rises by MINI_PLAYER + SMALL (120pt) while the reserved space
 * stayed at 72 — so the last 120pt of content sat behind the player with no
 * way to scroll it clear. Deriving both from `usePinnedActionBottom` is what
 * keeps them in step.
 */
export function usePinnedActionClearance(): number {
  return usePinnedActionBottom() + LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.XLARGE;
}

/**
 * Full-width primary CTA pinned above the tab bar — the single, reachable
 * action-button pattern shared by tab screens (practice review, playlist
 * play-all). Screens showing it set their bottom content padding from
 * `usePinnedActionClearance()` so list content never hides behind it.
 */
export function PinnedActionButton({
  title,
  onPress,
  loading,
}: PinnedActionButtonProps): JSX.Element {
  const colors = useColors();
  const bottom = usePinnedActionBottom();

  // The button floats over a scrolling list, and the elevation system carries
  // no shadow in dark mode — so on the dark theme there was
  // literally nothing separating the pill from the content it covered, and a
  // card edge showed through beneath it. Same fix as the article reader's
  // HeaderScrim, pointed the other way: the page colour fading up from the
  // bottom, so list content dissolves into the background before it reaches
  // the CTA instead of being abruptly clipped by it.
  //
  // The first stop is a zero-alpha *background*, not `'transparent'`. CSS-style
  // `transparent` is rgba(0,0,0,0), so a gradient running from it to an opaque
  // colour interpolates through semi-transparent BLACK — which on the light
  // theme painted a visible grey wash above the CTA. Same trap as alpha fills
  // collapsing toward black in `mixColors`; keeping the hue constant and moving
  // only alpha is what makes the fade read as the page dissolving.
  const scrimHeight = bottom + LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.XXLARGE;
  const scrimColors = [
    withOpacity(colors.background, 0),
    withOpacity(colors.background, 0.75),
    colors.background,
  ] as const;

  return (
    <>
      <Canvas
        style={[styles.scrim, { height: scrimHeight }]}
        pointerEvents="none"
        testID="pinned-action-scrim"
      >
        <Rect x={0} y={0} width={SCREEN_WIDTH} height={scrimHeight}>
          <LinearGradient start={vec(0, 0)} end={vec(0, scrimHeight)} colors={[...scrimColors]} />
        </Rect>
      </Canvas>

      <View style={[styles.container, { bottom }]}>
        <ThemedButton
          fullWidth
          title={title}
          onPress={onPress}
          variant="filled"
          size="large"
          shape="pill"
          loading={loading}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    right: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    zIndex: LAYOUT.Z_INDEX.CARD,
  },
  // Sits below the button (Z_INDEX.CARD) and above the scrolling content, and
  // spans the full width — the button is inset by the screen padding, but the
  // list it covers is not.
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
