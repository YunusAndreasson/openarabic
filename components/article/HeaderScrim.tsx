import { memo, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';

import { LAYOUT, MIN_TOUCH_TARGET, SCREEN_WIDTH } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

const STATIC_STYLES = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
});

/** How far ahead of the band the opaque layer starts fading in, in px. */
const OPAQUE_FADE_DISTANCE = 80;

interface HeaderScrimProps {
  colors: ThemeColors;
  /** Live scroll offset of the article list. */
  scrollY: SharedValue<number>;
  /** Height of the parallax hero, i.e. the list's top content inset. */
  headerHeight: number;
}

/**
 * Persistent (non-parallaxing) backdrop behind the status bar and the floating
 * close/listen/playlist buttons. ParallaxHeader's own gradient fades to
 * opacity 0 once content scrolls past the hero (by design — otherwise the
 * hero would sit on top of body text), which leaves the button row with
 * nothing behind it for the rest of the article. This sits above the scrolling
 * content and below the buttons (Z_INDEX.HEADER < OVERLAY).
 *
 * It has two layers, because the band has two jobs on either side of the hero:
 *
 * - Over the hero, a gradient — the photo has to stay visible, and a gradient
 *   is the standard way to keep white icons legible on an arbitrary image.
 * - Past the hero, a solid fill in the list's own background colour. A gradient
 *   cannot do this job: body text read straight through it and collided with
 *   the close icon ("All✕h bless him"). Text now scrolls cleanly out of sight
 *   under an opaque band instead.
 */
const HeaderScrimInternal = memo<HeaderScrimProps>(({ colors, scrollY, headerHeight }) => {
  const insets = useSafeAreaInsets();

  const buttonTop = Platform.OS === 'android' ? insets.top : LAYOUT.SPACING.LARGE;
  const scrimHeight = buttonTop + MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.LARGE;

  const gradientColors = useMemo(() => {
    const base = colors.gradientOverlay;
    return [
      withOpacity(base, 0.85),
      withOpacity(base, 0.6),
      withOpacity(base, 0.25),
      // Not the `transparent` keyword: Skia resolves it to rgba(0,0,0,0), so
      // the tail would interpolate towards black rather than towards `base`.
      withOpacity(base, 0),
    ] as const;
  }, [colors.gradientOverlay]);

  const containerStyle = useMemo(
    () => [STATIC_STYLES.container, { height: scrimHeight }],
    [scrimHeight],
  );

  // Body content reaches the band once the hero has scrolled past all but
  // `scrimHeight` of itself. Fade the solid layer in just before that, so the
  // change lands while the hero still covers the band rather than on top of
  // the first line of text.
  const opaqueStyle = useAnimatedStyle(() => {
    const fadeEnd = Math.max(0, headerHeight - scrimHeight);
    const fadeStart = Math.max(0, fadeEnd - OPAQUE_FADE_DISTANCE);
    return {
      opacity: interpolate(scrollY.get(), [fadeStart, fadeEnd], [0, 1], Extrapolation.CLAMP),
    };
  });

  const opaqueLayerStyle = useMemo(
    () => [STATIC_STYLES.container, { height: scrimHeight, backgroundColor: colors.background }],
    [scrimHeight, colors.background],
  );

  return (
    <>
      <Animated.View style={[opaqueLayerStyle, opaqueStyle]} pointerEvents="none" />
      <Canvas style={containerStyle} pointerEvents="none">
        <Rect x={0} y={0} width={SCREEN_WIDTH} height={scrimHeight}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, scrimHeight)}
            colors={[...gradientColors]}
          />
        </Rect>
      </Canvas>
    </>
  );
});

HeaderScrimInternal.displayName = 'HeaderScrim';

export const HeaderScrim = HeaderScrimInternal;
