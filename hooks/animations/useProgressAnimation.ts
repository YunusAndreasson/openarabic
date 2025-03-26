import { useCallback, useRef, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
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
  isAnimating: () => boolean;
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

  // This tracks whether an animation is currently in progress
  const isAnimating = useRef(false);

  // Improved function to update the progress value with animation
  const updateProgress = useCallback(
    (newPercentage: number) => {
      'worklet';
      // Validate input to ensure it's a number
      if (typeof newPercentage !== 'number') {
        return () => {}; // Return empty cleanup function
      }

      // Skip animation if value isn't changing significantly
      if (Math.abs(progress.value - newPercentage) < 0.5) {
        return () => {};
      }

      // Cancel any ongoing animations before starting a new one
      cancelAnimation(progress);

      // Mark that animation has been requested and is in progress
      hasAnimated.current = true;
      isAnimating.current = true;

      // Use withTiming for smooth animation to the new value
      progress.value = withTiming(
        newPercentage,
        {
          duration: duration,
          easing: TIMING_CONFIG.SLOW.easing,
        },
        finished => {
          // Animation is complete
          if (finished) {
            runOnJS(() => {
              isAnimating.current = false;
            })();
          }
        }
      );

      // Return cleanup function that cancels the animation if needed
      return () => {
        isAnimating.current = false;
        cancelAnimation(progress);
      };
    },
    [progress, duration]
  );

  // Function to reset progress to initial value
  const reset = useCallback(() => {
    'worklet';
    // Cancel any in-progress animations before resetting
    cancelAnimation(progress);
    progress.value = initialPercentage;
    hasAnimated.current = false;
    isAnimating.current = false;
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
      isAnimating.current = false;
    };
  }, [progress]);

  return {
    animatedStyle,
    updateProgress,
    progress,
    hasAnimated: () => hasAnimated.current,
    isAnimating: () => isAnimating.current,
    reset,
  };
};
