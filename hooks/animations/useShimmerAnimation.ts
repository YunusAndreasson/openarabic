import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';

/**
 * Hook to create a shimmer animation for skeleton loading effects
 * @param duration - Duration of one shimmer cycle in ms
 * @param minOpacity - Minimum opacity value during animation
 * @param maxOpacity - Maximum opacity value during animation
 * @returns Object with animated style and function to start animation
 */
export const useShimmerAnimation = (duration = 600, minOpacity = 0.5, maxOpacity = 0.8) => {
  const opacity = useSharedValue(maxOpacity);

  const startAnimation = useCallback(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(minOpacity, { duration }), withTiming(maxOpacity, { duration })),
      -1, // Infinite repetitions
      true // Reverse the animation for smoother transitions
    );
  }, [opacity, duration, minOpacity, maxOpacity]);

  const stopAnimation = useCallback(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return { animatedStyle, startAnimation, stopAnimation };
};
