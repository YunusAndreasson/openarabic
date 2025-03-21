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
  Layout,
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
    style = 'standard',
    autoStart = false,
    delay: rawDelay = 0,
    layoutStabilizationDelay = 0,
  } = options;

  // Validate parameters
  const duration = Math.max(0, rawDuration);
  const delay = Math.max(0, rawDelay);
  const validInitialOpacity = Math.max(0, Math.min(1, initialOpacity));

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  // Make sure duration is valid to avoid issues with built-in animations
  const safeDuration = Math.max(1, duration); // Minimum 1ms to avoid division by zero in Reanimated

  // Create standard entering and exiting animations
  // Note: Layout animations should be applied directly on Animated.View components
  // that use these animations, not here in the hook
  const entering = FadeIn.duration(safeDuration).delay(delay);
  const exiting = FadeOut.duration(safeDuration);

  // Track if component is mounted to prevent callbacks after unmount
  const isMountedRef = useRef(true);

  // Always create the shared value and all animation functions
  const opacity = useSharedValue(validInitialOpacity);

  // Cleanup shared animation values on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Cancel any pending animations by setting to the target value immediately
      try {
        opacity.value = validInitialOpacity;
      } catch (error) {
        // Handle potential errors during cleanup silently
      }
    };
  }, [opacity, validInitialOpacity]);

  // Safe callback runner that checks if component is still mounted
  const safeRunCallback = useCallback((callback?: () => void) => {
    'worklet';
    if (callback) {
      runOnJS(callback)();
    }
  }, []);

  const fadeIn = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      try {
        opacity.value = withTiming(
          1,
          {
            duration,
            easing: TIMING_CONFIG.MEDIUM.easing,
          },
          finished => {
            if (finished && onComplete) {
              runOnJS(onComplete)();
            }
          }
        );
      } catch (error) {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    },
    [opacity, duration]
  );

  const fadeOut = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      try {
        opacity.value = withTiming(
          0,
          {
            duration,
            easing: TIMING_CONFIG.MEDIUM.easing,
          },
          finished => {
            if (finished && onComplete) {
              runOnJS(onComplete)();
            }
          }
        );
      } catch (error) {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    },
    [opacity, duration]
  );

  const setOpacity = useCallback(
    (value: number, onComplete?: () => void) => {
      'worklet';
      // Ensure opacity value is between 0 and 1
      const safeValue = Math.max(0, Math.min(1, value));

      try {
        opacity.value = withTiming(
          safeValue,
          {
            duration,
            easing: TIMING_CONFIG.MEDIUM.easing,
          },
          finished => {
            if (finished && onComplete) {
              runOnJS(onComplete)();
            }
          }
        );
      } catch (error) {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    },
    [opacity, duration]
  );

  const reset = useCallback(() => {
    try {
      opacity.value = validInitialOpacity;
    } catch (error) {
      // Handle potential errors silently
    }
  }, [opacity, validInitialOpacity]);

  // These functions match the useFadeInAnimation API
  const startAnimation = useCallback(
    (startDelay = delay, onComplete?: () => void) => {
      // Ensure delay is not negative
      const safeDelay = Math.max(0, startDelay);

      try {
        opacity.value = withDelay(
          safeDelay,
          withTiming(1, { duration, easing: TIMING_CONFIG.MEDIUM.easing }, finished => {
            if (finished && onComplete && runOnJS) {
              runOnJS(safeRunCallback)(onComplete);
            }
          })
        );
      } catch (error) {
        if (onComplete && runOnJS) {
          runOnJS(safeRunCallback)(onComplete);
        }
      }
    },
    [opacity, duration, delay, safeRunCallback]
  );

  const reverseAnimation = useCallback(
    (startDelay = delay, onComplete?: () => void) => {
      // Ensure delay is not negative
      const safeDelay = Math.max(0, startDelay);

      try {
        opacity.value = withDelay(
          safeDelay,
          withTiming(
            validInitialOpacity,
            { duration, easing: TIMING_CONFIG.MEDIUM.easing },
            finished => {
              if (finished && onComplete && runOnJS) {
                runOnJS(safeRunCallback)(onComplete);
              }
            }
          )
        );
      } catch (error) {
        if (onComplete && runOnJS) {
          runOnJS(safeRunCallback)(onComplete);
        }
      }
    },
    [opacity, validInitialOpacity, duration, delay, safeRunCallback]
  );

  const animatedStyle = useAnimatedStyle(
    () => {
      return {
        opacity: opacity.value,
      };
    },
    // Dependencies array for useAnimatedStyle - improving performance
    [opacity]
  );

  // Auto-start animation if enabled - using UI thread
  useEffect(() => {
    if (autoStart && isMountedRef.current) {
      // We still need a small delay to ensure component is mounted properly
      // Even with Layout animations, a small initialization delay helps prevent flickering
      const minDelay = Math.max(0, 5);

      // Schedule animation on the UI thread
      runOnUI(() => {
        'worklet';
        // Ensure we're at the starting opacity
        opacity.value = validInitialOpacity;
        // Use withDelay to schedule the animation on the UI thread
        opacity.value = withDelay(
          minDelay,
          withTiming(1, { duration, easing: TIMING_CONFIG.MEDIUM.easing })
        );
      })();
    }
  }, [autoStart, duration, validInitialOpacity, opacity]);

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
