import { useCallback } from 'react';
import { useSharedValue, withTiming, useAnimatedStyle, withDelay } from 'react-native-reanimated';

/**
 * Hook to create a fade-in animation with a subtle rise effect
 * @param delay - Delay before animation starts in ms
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and function to start animation
 */
export const useFadeInAnimation = (delay = 0, duration = 300) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(15);

  const startAnimation = useCallback(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    translateY.value = withDelay(delay, withTiming(0, { duration: duration + 50 }));
  }, [opacity, translateY, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return { animatedStyle, startAnimation };
};
