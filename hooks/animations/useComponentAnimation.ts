import { useCallback, useEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  runOnJS,
  FadeIn,
  FadeOut,
  cancelAnimation,
} from 'react-native-reanimated';
import type { AnimatedStyleProp, SharedValue } from 'react-native-reanimated';

import { TIMING_CONFIG } from './animationConfigs';

interface ComponentAnimationResult {
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  startAnimation: (onComplete?: () => void) => void;
  resetAnimation: () => void;
  opacity: SharedValue<number>;
  entering: ReturnType<typeof FadeIn.duration>;
  exiting: ReturnType<typeof FadeOut.duration>;
}

/**
 * Hook for managing component animation states with delayed readiness
 * @param delay - Delay in ms before component is considered ready
 * @returns Object with animation state and animated style
 */
export const useComponentAnimation = (delay = 300): ComponentAnimationResult => {
  const opacity = useSharedValue(0);
  const isMountedRef = useRef(true);

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  const entering = FadeIn.duration(TIMING_CONFIG.FAST.duration).delay(delay);
  const exiting = FadeOut.duration(TIMING_CONFIG.FAST.duration);

  // Safe callback runner that checks if component is still mounted
  const safeRunCallback = useCallback((callback?: () => void) => {
    'worklet';
    if (callback && isMountedRef.current) {
      runOnJS(callback)();
    }
  }, []);

  // Start animation function that can be called when component mounts
  const startAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      opacity.value = withDelay(
        delay,
        withTiming(
          1,
          {
            duration: TIMING_CONFIG.FAST.duration,
            easing: TIMING_CONFIG.FAST.easing,
          },
          finished => {
            if (finished) {
              safeRunCallback(onComplete);
            }
          }
        )
      );
    },
    [opacity, delay, safeRunCallback]
  );

  // Reset animation function
  const resetAnimation = useCallback(() => {
    'worklet';
    opacity.value = 0;
  }, [opacity]);

  // Create animated style for opacity
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Cleanup shared animation values on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelAnimation(opacity);
    };
  }, [opacity]);

  return {
    animatedStyle,
    startAnimation,
    resetAnimation,
    opacity,
    // Export the built-in animations for direct use with Animated.View
    entering,
    exiting,
  };
};
