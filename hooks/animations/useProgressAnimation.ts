import { useCallback, useRef } from 'react';
import { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Hook to create a progress animation for progress bars
 * @param initialPercentage - Initial percentage value (0-100)
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and function to update the progress
 */
export const useProgressAnimation = (
  initialPercentage = 0,
  duration = TIMING_CONFIG.SLOW.duration
) => {
  const percentage = useSharedValue(initialPercentage);
  const isInitialMount = useRef(true);

  const updateProgress = useCallback(
    (newPercentage: number, animationDelay = 0) => {
      'worklet';
      // Small delay to ensure the component is fully rendered on initial mount
      const delay = isInitialMount.current ? Math.max(100, animationDelay) : animationDelay;

      const animationTimeout = setTimeout(() => {
        percentage.value = withTiming(newPercentage, {
          duration,
          easing: TIMING_CONFIG.SLOW.easing,
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
