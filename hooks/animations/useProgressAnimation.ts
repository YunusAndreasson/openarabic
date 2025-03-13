import { useCallback, useRef, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
  withDelay,
  runOnJS,
  cancelAnimation,
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
  reset: () => void;
}

/**
 * Hook to create a progress animation for progress bars
 * @param initialPercentage - Initial percentage value (0-100)
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and function to update the progress
 */
export const useProgressAnimation = (
  initialPercentage: number = 0,
  duration = TIMING_CONFIG.SLOW.duration
): ProgressAnimationResult => {
  // Store the progress value as a shared value for animations
  const progress = useSharedValue(initialPercentage);

  // This tracks whether the animation has been triggered
  const hasAnimated = useRef(false);

  // Improved function to update the progress value with animation
  const updateProgress = useCallback(
    (newPercentage: number) => {
      // Validate input to ensure it's a number
      if (typeof newPercentage !== 'number') {
        console.warn('useProgressAnimation: newPercentage must be a number');
        return () => {}; // Return empty cleanup function
      }

      // Mark that animation has been requested
      hasAnimated.current = true;

      // Animate directly to the new value without resetting to 0 first
      // This prevents the progress bar from briefly disappearing
      progress.value = withDelay(
        50, // Small delay for visual effect
        withTiming(newPercentage, {
          duration: duration,
          easing: TIMING_CONFIG.SLOW.easing,
        })
      );

      // Return cleanup function that cancels the animation if needed
      return () => {
        cancelAnimation(progress);
      };
    },
    [progress, duration]
  );

  // Function to reset progress to initial value
  const reset = useCallback(() => {
    cancelAnimation(progress);
    progress.value = initialPercentage;
    hasAnimated.current = false;
  }, [progress, initialPercentage]);

  // Create animated style based on the progress value
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.max(0, Math.min(100, progress.value))}%`,
    };
  });

  // Reset animation state on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing animations to prevent memory leaks
      cancelAnimation(progress);
      hasAnimated.current = false;
    };
  }, [progress]);

  return {
    animatedStyle,
    updateProgress,
    progress,
    hasAnimated: () => hasAnimated.current,
    reset,
  };
};
