import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';

interface PulsatingLoaderProps {
  /**
   * Size of the loader circle
   */
  size?: number;
}

// Default loader size aligned with touch target system
const DEFAULT_LOADER_SIZE = MIN_TOUCH_TARGET.LARGE; // 48px

// Loader border width calculation constants
const MIN_BORDER_WIDTH = 3; // Minimum border width in pixels
const BORDER_WIDTH_SCALE = 0.06; // Border width as percentage of loader size

// Reanimated v4 CSS keyframe animation — replaces useEffect + withRepeat + withTiming
const pulsateStyle = {
  animationName: {
    '0%': { transform: [{ scale: 0.8 }] },
    '100%': { transform: [{ scale: 1.2 }] },
  },
  animationDuration: `${TIMING_CONSTANTS.PULSATE_DURATION / 2}ms`,
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out',
} as ReanimatedCSSAnimationStyle;

/**
 * A pulsating circle loader component for smooth loading states
 * Uses the brand tint (sage) color and follows Material Design principles
 */
export function PulsatingLoader({ size = DEFAULT_LOADER_SIZE }: PulsatingLoaderProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.loader,
          pulsateStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(MIN_BORDER_WIDTH, size * BORDER_WIDTH_SCALE), // Scales with size, 3px minimum
            borderColor: colors.tint,
            shadowColor: colors.shadow, // Theme-aware shadow color
          },
        ]}
      />
    </View>
  );
}

PulsatingLoader.displayName = 'PulsatingLoader';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    // Shadow for depth (Material Design elevation)
    ...LAYOUT.ELEVATION.SUBTLE,
  },
});
