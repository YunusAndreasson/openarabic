import { useCallback, useEffect, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  runOnJS,
  FadeIn,
  FadeOut,
  runOnUI,
  cancelAnimation,
} from 'react-native-reanimated';

import { TIMING_CONFIG } from './animationConfigs';
import type { SharedValue } from './types';

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

  /**
   * Additional delay to wait for layout stabilization
   * Helps prevent jumps when layout changes during animation
   * @default 0
   */
  layoutStabilizationDelay?: number;
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

// Constants moved outside to prevent recreation
const MIN_DURATION = 1;
const MIN_MOUNT_DELAY = 5;

// Animation config memoized outside to prevent recreation
const getTimingConfig = (duration: number) => ({
  duration,
  easing: TIMING_CONFIG.MEDIUM.easing,
});

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
    duration: rawDuration = TIMING_CONFIG.MEDIUM.duration,
    autoStart = false,
    delay: rawDelay = 0,
  } = options;

  // Validate parameters - memoized to prevent recalculation
  const duration = useRef(Math.max(0, rawDuration)).current;
  const delay = useRef(Math.max(0, rawDelay)).current;
  const validInitialOpacity = useRef(Math.max(0, Math.min(1, initialOpacity))).current;
  const safeDuration = useRef(Math.max(MIN_DURATION, duration)).current;

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  const entering = useRef(FadeIn.duration(safeDuration).delay(delay)).current;
  const exiting = useRef(FadeOut.duration(safeDuration)).current;

  // Track if component is mounted to prevent callbacks after unmount
  const isMountedRef = useRef(true);
  const opacity = useSharedValue(validInitialOpacity);
  const timingConfig = useRef(getTimingConfig(duration)).current;

  // Cleanup shared animation values on unmount - optimized with single cleanup function
  useEffect(() => {
    const cleanup = () => {
      isMountedRef.current = false;
      opacity.value = validInitialOpacity;
      cancelAnimation(opacity);
    };

    return cleanup;
  }, [opacity, validInitialOpacity]);

  // Safe callback runner that checks if component is still mounted
  const safeRunCallback = useCallback((callback?: () => void) => {
    'worklet';
    if (callback && isMountedRef.current) {
      runOnJS(callback)();
    }
  }, []);

  // Common animation function to reduce code duplication - memoized with useCallback
  const animateOpacityTo = useCallback(
    (targetValue: number, onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(targetValue, timingConfig, finished => {
        if (finished) {
          safeRunCallback(onComplete);
        }
      });
    },
    [opacity, timingConfig, safeRunCallback]
  );

  const fadeIn = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      animateOpacityTo(1, onComplete);
    },
    [animateOpacityTo]
  );

  const fadeOut = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      animateOpacityTo(0, onComplete);
    },
    [animateOpacityTo]
  );

  const setOpacity = useCallback(
    (value: number, onComplete?: () => void) => {
      'worklet';
      const safeValue = Math.max(0, Math.min(1, value));
      animateOpacityTo(safeValue, onComplete);
    },
    [animateOpacityTo]
  );

  const reset = useCallback(() => {
    opacity.value = validInitialOpacity;
  }, [opacity, validInitialOpacity]);

  const startAnimation = useCallback(
    (startDelay = delay, onComplete?: () => void) => {
      runOnUI(() => {
        'worklet';
        const safeDelay = Math.max(0, startDelay);
        opacity.value = withDelay(
          safeDelay,
          withTiming(1, timingConfig, finished => {
            if (finished) {
              safeRunCallback(onComplete);
            }
          })
        );
      })();
    },
    [opacity, delay, timingConfig, safeRunCallback]
  );

  const reverseAnimation = useCallback(
    (startDelay = delay, onComplete?: () => void) => {
      runOnUI(() => {
        'worklet';
        const safeDelay = Math.max(0, startDelay);
        opacity.value = withDelay(
          safeDelay,
          withTiming(validInitialOpacity, timingConfig, finished => {
            if (finished) {
              safeRunCallback(onComplete);
            }
          })
        );
      })();
    },
    [opacity, validInitialOpacity, delay, timingConfig, safeRunCallback]
  );

  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
    }),
    [opacity]
  );

  // Auto-start animation if enabled - using UI thread
  useEffect(() => {
    if (autoStart && isMountedRef.current) {
      runOnUI(() => {
        'worklet';
        // Set directly to target without initial flash to prevent visual glitch
        opacity.value = withDelay(MIN_MOUNT_DELAY, withTiming(1, timingConfig));
      })();
    }
  }, [autoStart, opacity, timingConfig]);

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
