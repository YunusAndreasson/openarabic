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
 * Hook to create a simple fade-in animation
 * @param initialOpacity - Initial opacity value (default 0)
 * @param duration - Duration of animation in ms (default from TIMING_CONFIG.MEDIUM)
 * @returns Object with animated style and functions to control animation
 */
export const useFadeInAnimation = (
  initialOpacity = 0,
  duration = TIMING_CONFIG.MEDIUM.duration
) => {
  const opacity = useSharedValue(initialOpacity);

  const startAnimation = useCallback(
    (delay = 0, onComplete?: () => void) => {
      'worklet';
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration, easing: TIMING_CONFIG.MEDIUM.easing }, () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        })
      );
    },
    [opacity, duration]
  );

  const reverseAnimation = useCallback(
    (delay = 0, onComplete?: () => void) => {
      'worklet';
      opacity.value = withDelay(
        delay,
        withTiming(initialOpacity, { duration, easing: TIMING_CONFIG.MEDIUM.easing }, () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        })
      );
    },
    [opacity, initialOpacity, duration]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return {
    animatedStyle,
    startAnimation,
    reverseAnimation,
    opacity,
  };
};
