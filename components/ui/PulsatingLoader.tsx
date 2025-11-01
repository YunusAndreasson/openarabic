import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface PulsatingLoaderProps {
  /**
   * Size of the loader circle
   */
  size?: number;

  /**
   * Color of the loader - defaults to tint (sage color)
   */
  colorName?: 'tint' | 'primary' | 'success' | 'warning' | 'error';

  /**
   * Duration of the pulsing animation in milliseconds
   */
  duration?: number;
}

// Default loader size aligned with touch target system
const DEFAULT_LOADER_SIZE = MIN_TOUCH_TARGET.LARGE; // 48px

// Loader border width calculation constants
const MIN_BORDER_WIDTH = 3; // Minimum border width in pixels
const BORDER_WIDTH_SCALE = 0.06; // Border width as percentage of loader size

/**
 * A pulsating circle loader component for smooth loading states
 * Uses the brand sage color by default and follows Material Design principles
 */
export function PulsatingLoader({
  size = DEFAULT_LOADER_SIZE,
  colorName = 'tint',
  duration = 1500,
}: PulsatingLoaderProps) {
  const colors = useColors();

  // Shared value for the scale animation
  const scale = useSharedValue(0.8);

  // Start the pulsating animation when component mounts
  React.useEffect(() => {
    scale.set(
      withRepeat(
        withTiming(1.2, {
          duration: duration / 2,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design easing
        }),
        -1, // Infinite loop
        true, // Reverse direction
      ),
    );
  }, [scale, duration]);

  // Animated style for the pulsating effect
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  // Get the loader color based on the color name
  const loaderColor = colors[colorName];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.loader,
          animatedStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(MIN_BORDER_WIDTH, size * BORDER_WIDTH_SCALE), // Scales with size, 3px minimum
            borderColor: loaderColor,
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
