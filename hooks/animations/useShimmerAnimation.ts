import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Hook to create a shimmer animation for skeleton loading effects
 * @param duration - Duration of one shimmer cycle in ms
 * @param minOpacity - Minimum opacity value during animation
 * @param maxOpacity - Maximum opacity value during animation
 * @returns Object with animated style and function to start animation
 */
export const useShimmerAnimation = (
  duration = TIMING_CONFIG.SLOW.duration,
  minOpacity = 0.5,
  maxOpacity = 0.8
) => {
  const opacity = useSharedValue(maxOpacity);

  const startAnimation = useCallback(() => {
    'worklet';
    opacity.value = withRepeat(
      withSequence(
        withTiming(minOpacity, { duration: duration / 2 }),
        withTiming(maxOpacity, { duration: duration / 2 })
      ),
      -1, // Infinite repetitions
      true // Reverse the animation for smoother transitions
    );
  }, [opacity, duration, minOpacity, maxOpacity]);

  const stopAnimation = useCallback(() => {
    'worklet';
    opacity.value = withTiming(1, { duration: TIMING_CONFIG.MEDIUM.duration });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return { animatedStyle, startAnimation, stopAnimation, opacity };
};
