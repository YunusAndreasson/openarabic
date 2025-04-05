import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

export type PulseStyle = 'gentle' | 'dramatic' | 'bounce';

export interface PulseAnimationOptions {
  /**
   * Style of pulse animation
   * - 'gentle': Subtle pulsing suitable for loaders
   * - 'dramatic': More pronounced scaling for attention-grabbing elements
   * - 'bounce': Elastic bounce effect for playful interactions
   * @default 'gentle'
   */
  style?: PulseStyle;

  /**
   * Animation duration in milliseconds
   * @default 1000
   */
  duration?: number;

  /**
   * Maximum scale value during pulse
   * For 'gentle' style, a value between 1.05-1.1 is recommended
   * For 'dramatic' style, a value between 1.1-1.2 is recommended
   * For 'bounce' style, a value between 1.2-1.3 is recommended
   * @default 1.05 for gentle, 1.15 for dramatic, 1.25 for bounce
   */
  pulseMagnitude?: number;

  /**
   * Auto-start animation on mount
   * @default false
   */
  autoStart?: boolean;

  /**
   * Whether to use transform scale or opacity for animation
   * @default 'scale'
   */
  type?: 'scale' | 'opacity' | 'both';
}

export interface PulseAnimationResult {
  /**
   * Animated style to apply to component
   */
  animatedStyle: {
    transform?: { scale: number }[];
    opacity?: number;
  };

  /**
   * Start the pulse animation
   */
  start: () => void;

  /**
   * Stop the pulse animation
   */
  stop: () => void;

  /**
   * Reset animation to initial state
   */
  reset: () => void;

  /**
   * Whether animation is currently running
   */
  isRunning: boolean;
}

/**
 * Hook for creating pulse animations (scale or opacity)
 * Useful for loaders, notifications, and other attention-grabbing elements
 *
 * @example
 * const { animatedStyle, start, stop } = usePulseAnimation({
 *   style: 'gentle',
 *   pulseMagnitude: 1.05,
 *   duration: 1000,
 *   autoStart: true
 * });
 *
 * // In your component
 * return (
 *   <Animated.View style={[styles.circle, animatedStyle]}>
 *     {children}
 *   </Animated.View>
 * );
 */
export const usePulseAnimation = (options: PulseAnimationOptions = {}): PulseAnimationResult => {
  const {
    style = 'gentle',
    duration = 1000,
    autoStart = false,
    type = 'scale',
    pulseMagnitude: customMagnitude,
  } = options;

  // Determine scale magnitude based on style if not provided
  const pulseMagnitude =
    customMagnitude ?? (style === 'gentle' ? 1.05 : style === 'dramatic' ? 1.15 : 1.25);

  // Animation shared values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Track if animation is running
  const isRunningRef = useSharedValue(false);

  // Determine easing function based on style
  const easingFunction =
    style === 'bounce'
      ? Easing.elastic(1.2)
      : style === 'dramatic'
        ? Easing.bezier(0.25, 0.1, 0.25, 1)
        : Easing.inOut(Easing.ease);

  // Create animated style
  const animatedStyle = useAnimatedStyle(() => {
    const styleObj: {
      transform?: { scale: number }[];
      opacity?: number;
    } = {};

    if (type === 'scale' || type === 'both') {
      styleObj.transform = [{ scale: scale.value }];
    }

    if (type === 'opacity' || type === 'both') {
      styleObj.opacity = opacity.value;
    }

    return styleObj;
  });

  // Start animation
  const start = useCallback(() => {
    // Reset values first
    scale.value = 1;
    opacity.value = 1;

    // Mark as running
    isRunningRef.value = true;

    // Apply appropriate animation based on type
    if (type === 'scale' || type === 'both') {
      scale.value = withRepeat(
        withTiming(pulseMagnitude, {
          duration: duration / 2,
          easing: easingFunction,
        }),
        -1, // Infinite repetition
        true // Reverse on each iteration
      );
    }

    if (type === 'opacity' || type === 'both') {
      // For opacity, use different ranges based on style
      const opacityMin = style === 'gentle' ? 0.7 : style === 'dramatic' ? 0.5 : 0.6;

      opacity.value = withRepeat(
        withTiming(opacityMin, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1, // Infinite repetition
        true // Reverse on each iteration
      );
    }
  }, [scale, opacity, pulseMagnitude, duration, type, style, easingFunction, isRunningRef]);

  // Stop animation
  const stop = useCallback(() => {
    if (isRunningRef.value) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      isRunningRef.value = false;
    }
  }, [scale, opacity, isRunningRef]);

  // Reset to initial state
  const reset = useCallback(() => {
    stop();
    scale.value = 1;
    opacity.value = 1;
  }, [scale, opacity, stop]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      // Clean up animations on unmount
      stop();
    };
  }, [autoStart, start, stop]);

  return {
    animatedStyle,
    start,
    stop,
    reset,
    isRunning: isRunningRef.value,
  };
};
