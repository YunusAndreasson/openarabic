import { memo, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
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

interface HeaderScrimProps {
  colors: ThemeColors;
}

/**
 * Persistent (non-parallaxing) scrim behind the status bar and the floating
 * close/listen/playlist buttons. ParallaxHeader's own gradient fades to
 * opacity 0 once content scrolls past the hero (by design — otherwise the
 * hero would sit on top of body text), which leaves the button row with
 * nothing behind it for the rest of the article: body text scrolls directly
 * underneath the status bar and button row with no backdrop. This sits above
 * the scrolling content and below the buttons (Z_INDEX.HEADER < OVERLAY) so
 * the top of the screen always has a readable, consistent backdrop.
 */
const HeaderScrimInternal = memo<HeaderScrimProps>(({ colors }) => {
  const insets = useSafeAreaInsets();

  const buttonTop = Platform.OS === 'android' ? insets.top : LAYOUT.SPACING.LARGE;
  const scrimHeight = buttonTop + MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.LARGE;

  const gradientColors = useMemo(() => {
    const base = colors.gradientOverlay;
    return [
      withOpacity(base, 0.85),
      withOpacity(base, 0.6),
      withOpacity(base, 0.25),
      'transparent',
    ] as const;
  }, [colors.gradientOverlay]);

  const containerStyle = useMemo(
    () => [STATIC_STYLES.container, { height: scrimHeight }],
    [scrimHeight],
  );

  return (
    <Canvas style={containerStyle} pointerEvents="none">
      <Rect x={0} y={0} width={SCREEN_WIDTH} height={scrimHeight}>
        <LinearGradient start={vec(0, 0)} end={vec(0, scrimHeight)} colors={[...gradientColors]} />
      </Rect>
    </Canvas>
  );
});

HeaderScrimInternal.displayName = 'HeaderScrim';

export const HeaderScrim = HeaderScrimInternal;
