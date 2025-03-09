import { useCallback, useRef, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
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
  // Store the progress value as a shared value for animations
  const progress = useSharedValue(0);

  // This tracks whether the animation has been triggered
  const hasAnimated = useRef(false);

  // Simple function to update the progress value with animation
  const updateProgress = useCallback(
    (newPercentage: number) => {
      // Mark that animation has been requested
      hasAnimated.current = true;

      // Force value to 0 first, then animate
      progress.value = 0;

      // Animate to the new percentage
      setTimeout(() => {
        progress.value = withTiming(newPercentage, {
          duration: duration,
          easing: TIMING_CONFIG.SLOW.easing,
        });
      }, 50);

      // Return cleanup function
      return () => {
        // No action needed for cleanup
      };
    },
    [progress, duration]
  );

  // Create animated style based on the progress value
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
    };
  });

  // Reset animation state on unmount
  useEffect(() => {
    return () => {
      hasAnimated.current = false;
    };
  }, []);

  return {
    animatedStyle,
    updateProgress,
    progress,
    hasAnimated: () => hasAnimated.current,
  };
};
