import { useCallback } from 'react';
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

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  const entering = FadeIn.duration(duration);
  const exiting = FadeOut.duration(duration);

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
    // Export the built-in animations for direct use with Animated.View
    entering,
    exiting,
  };
};
