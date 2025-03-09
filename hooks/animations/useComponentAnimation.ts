import { useCallback } from 'react';
import {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Hook for managing component animation states with delayed readiness
 * @param delay - Delay in ms before component is considered ready
 * @returns Object with animation state and animated style
 */
export const useComponentAnimation = (delay = 300) => {
  const opacity = useSharedValue(0);

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
          () => {
            if (onComplete && runOnJS) {
              runOnJS(onComplete)();
            }
          }
        )
      );
    },
    [opacity, delay]
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

  return {
    animatedStyle,
    startAnimation,
    resetAnimation,
    opacity,
  };
};
