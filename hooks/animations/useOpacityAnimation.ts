import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';
import { SharedValue } from './types';

export type FadeAnimationStyle = 'standard' | 'entrance-only';

export interface FadeAnimationOptions {
  /**
   * Initial opacity value
   * @default 1
   */
  initialOpacity?: number;

  /**
   * Duration of animation in ms
   * @default TIMING_CONFIG.MEDIUM.duration
   */
  duration?: number;

  /**
   * Style of fade animation
   * - 'standard': Full control over opacity with shared value
   * - 'entrance-only': Only provides entering/exiting animations for direct use with Animated.View
   * @default 'standard'
   */
  style?: FadeAnimationStyle;

  /**
   * Whether to automatically start the fade-in animation on mount
   * @default false
   */
  autoStart?: boolean;

  /**
   * Delay before starting the animation (in ms)
   * @default 0
   */
  delay?: number;
}

export interface FadeAnimationResult {
  /**
   * Shared value for opacity animation (only in standard style)
   */
  opacity: SharedValue<number>;

  /**
   * Animated style to apply to the component (only in standard style)
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;

  /**
   * Function to fade in the component (only in standard style)
   * @param onComplete - Optional callback when animation completes
   */
  fadeIn: (onComplete?: () => void) => void;

  /**
   * Function to fade out the component (only in standard style)
   * @param onComplete - Optional callback when animation completes
   */
  fadeOut: (onComplete?: () => void) => void;

  /**
   * Function to set a specific opacity value (only in standard style)
   * @param value - Opacity value between 0 and 1
   * @param onComplete - Optional callback when animation completes
   */
  setOpacity: (value: number, onComplete?: () => void) => void;

  /**
   * Function to reset opacity to initial value (only in standard style)
   */
  reset: () => void;

  /**
   * Function to start fade-in animation with optional delay (only in standard style)
   * @param delay - Delay in ms before starting animation
   * @param onComplete - Optional callback when animation completes
   */
  startAnimation: (delay?: number, onComplete?: () => void) => void;

  /**
   * Function to reverse animation back to initial opacity (only in standard style)
   * @param delay - Delay in ms before starting animation
   * @param onComplete - Optional callback when animation completes
   */
  reverseAnimation: (delay?: number, onComplete?: () => void) => void;

  /**
   * The entering animation to apply to an Animated.View
   */
  entering: ReturnType<typeof FadeIn.duration>;

  /**
   * The exiting animation to apply to an Animated.View
   */
  exiting: ReturnType<typeof FadeOut.duration>;
}

/**
 * Unified hook for opacity and fade animations
 * Combines functionality from useFadeInAnimation, useOpacityAnimation, and useFadeInEntrance
 *
 * @param options - Configuration options for the fade animation
 * @returns Animation controls and styles based on the selected style
 */
export const useOpacityAnimation = (options: FadeAnimationOptions = {}): FadeAnimationResult => {
  const {
    initialOpacity = 1,
    duration = TIMING_CONFIG.MEDIUM.duration,
    style = 'standard',
    autoStart = false,
    delay = 0,
  } = options;

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  const entering = FadeIn.duration(duration).delay(delay);
  const exiting = FadeOut.duration(duration);

  // Always create the shared value and all animation functions
  const opacity = useSharedValue(initialOpacity);

  const fadeIn = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(
        1,
        {
          duration,
          easing: TIMING_CONFIG.MEDIUM.easing,
        },
        () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        }
      );
    },
    [opacity, duration]
  );

  const fadeOut = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(
        0,
        {
          duration,
          easing: TIMING_CONFIG.MEDIUM.easing,
        },
        () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        }
      );
    },
    [opacity, duration]
  );

  const setOpacity = useCallback(
    (value: number, onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(
        value,
        {
          duration,
          easing: TIMING_CONFIG.MEDIUM.easing,
        },
        () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        }
      );
    },
    [opacity, duration]
  );

  const reset = useCallback(() => {
    'worklet';
    opacity.value = initialOpacity;
  }, [opacity, initialOpacity]);

  // These functions match the useFadeInAnimation API
  const startAnimation = useCallback(
    (startDelay = delay, onComplete?: () => void) => {
      'worklet';
      opacity.value = withDelay(
        startDelay,
        withTiming(1, { duration, easing: TIMING_CONFIG.MEDIUM.easing }, () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        })
      );
    },
    [opacity, duration, delay]
  );

  const reverseAnimation = useCallback(
    (startDelay = delay, onComplete?: () => void) => {
      'worklet';
      opacity.value = withDelay(
        startDelay,
        withTiming(initialOpacity, { duration, easing: TIMING_CONFIG.MEDIUM.easing }, () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        })
      );
    },
    [opacity, initialOpacity, duration, delay]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Auto-start animation if enabled
  useEffect(() => {
    if (autoStart) {
      startAnimation();
    }
  }, [autoStart, startAnimation]);

  // For entrance-only style, we still return all functions but they won't be used
  return {
    opacity,
    animatedStyle,
    fadeIn,
    fadeOut,
    setOpacity,
    reset,
    startAnimation,
    reverseAnimation,
    entering,
    exiting,
  };
};
