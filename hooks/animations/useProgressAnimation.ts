import { useCallback, useRef } from 'react';
import { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

/**
 * Hook to create a progress animation for progress bars
 * @param initialPercentage - Initial percentage value (0-100)
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and function to update the progress
 */
export const useProgressAnimation = (initialPercentage = 0, duration = 1000) => {
  const percentage = useSharedValue(initialPercentage);
  const isInitialMount = useRef(true);

  const updateProgress = useCallback(
    (newPercentage: number, animationDelay = 0) => {
      // Small delay to ensure the component is fully rendered on initial mount
      const delay = isInitialMount.current ? Math.max(100, animationDelay) : animationDelay;

      const animationTimeout = setTimeout(() => {
        percentage.value = withTiming(newPercentage, {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        isInitialMount.current = false;
      }, delay);

      return () => clearTimeout(animationTimeout);
    },
    [percentage, duration]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${percentage.value}%`,
    };
  });

  return {
    animatedStyle,
    updateProgress,
    percentage,
  };
};
