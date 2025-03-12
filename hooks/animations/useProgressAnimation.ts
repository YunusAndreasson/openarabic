import { useCallback, useRef, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Result type for the useProgressAnimation hook
 */
export interface ProgressAnimationResult {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  updateProgress: (newPercentage: number) => () => void;
  progress: SharedValue<number>;
  hasAnimated: () => boolean;
}

/**
 * Hook to create a progress animation for progress bars
 * @param initialPercentage - Initial percentage value (0-100)
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and function to update the progress
 */
export const useProgressAnimation = (
  duration = TIMING_CONFIG.SLOW.duration
): ProgressAnimationResult => {
  // Store the progress value as a shared value for animations
  const progress = useSharedValue(0);

  // This tracks whether the animation has been triggered
  const hasAnimated = useRef(false);

  // Improved function to update the progress value with animation
  const updateProgress = useCallback(
    (newPercentage: number) => {
      // Mark that animation has been requested
      hasAnimated.current = true;

      // Reset to 0 first
      progress.value = 0;

      // Use withDelay for more reliable sequencing
      progress.value = withDelay(
        50, // Small delay for visual effect
        withTiming(newPercentage, {
          duration: duration,
          easing: TIMING_CONFIG.SLOW.easing,
        })
      );

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
