import { useCallback } from 'react';
import { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

/**
 * Hook to create a scale animation
 * @param initialScale - Initial scale value
 * @param targetScale - Target scale value
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and functions to control the animation
 */
export const useScaleAnimation = (initialScale = 0.95, targetScale = 1, duration = 300) => {
  const scale = useSharedValue(initialScale);

  const startAnimation = useCallback(() => {
    scale.value = withTiming(targetScale, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [scale, targetScale, duration]);

  const reverseAnimation = useCallback(() => {
    scale.value = withTiming(initialScale, {
      duration,
      easing: Easing.in(Easing.cubic),
    });
  }, [scale, initialScale, duration]);

  const reset = useCallback(() => {
    scale.value = initialScale;
  }, [scale, initialScale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return {
    animatedStyle,
    startAnimation,
    reverseAnimation,
    reset,
    scale,
  };
};
