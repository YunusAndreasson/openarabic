import { useCallback } from 'react';
import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Hook to create a fade-in animation
 * @param delay - Delay before animation starts in ms
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and function to start animation
 */
export const useFadeInAnimation = (delay = 0, duration = 300) => {
  const opacity = useSharedValue(0);

  const startAnimation = useCallback(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, { duration });
    }, delay);
  }, [opacity, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return { animatedStyle, startAnimation };
};
