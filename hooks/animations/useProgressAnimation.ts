import { useCallback, useRef, useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import type { SharedValue, WithTimingConfig } from 'react-native-reanimated';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  cancelAnimation,
  runOnUI,
} from 'react-native-reanimated';

import {
  TIMING_CONFIG,
  PROGRESS_SKIP_THRESHOLD,
  PROGRESS_MAX_VALUE,
} from '@/constants/animation';
import type { AnimatedStyleProp } from '@/types/ui/base.types';



/**
 * Result type for the useProgressAnimation hook
 */
export interface ProgressAnimationResult {
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  updateProgress: (newPercentage: number) => () => void;
  progress: SharedValue<number>;
  hasAnimated: () => boolean;
  isAnimating: () => boolean;
  reset: () => void;
}

/**
 * Hook to create a progress animation for progress bars
 * @param initialPercentage - Initial percentage value (0-10000, representing 0-100%)
 * @param duration - Duration of animation in ms
 * @param timingConfig - Custom timing configuration
 * @returns Object with animated style and function to update the progress
 */
export const useProgressAnimation = <D extends number = number>(
  initialPercentage: number = 0,
  duration: D = TIMING_CONFIG.SLOW.duration as D,
  timingConfig?: WithTimingConfig
): ProgressAnimationResult => {
  // Store the progress value as a shared value for animations
  const progress = useSharedValue(initialPercentage);

  // This tracks whether the animation has been triggered
  const hasAnimated = useRef(false);

  // This tracks whether an animation is currently in progress
  // Using a shared value prevents the object from becoming read-only
  // when captured by worklets
  const isAnimating = useSharedValue(false);

  // Track if component is mounted
  const isMounted = useSharedValue(true);

  // Memoize timing configuration
  const finalTimingConfig = useRef<WithTimingConfig>(
    timingConfig ?? {
      duration,
      easing: TIMING_CONFIG.SLOW.easing,
    }
  ).current;

  // Improved function to update the progress value with animation
  const updateProgress = useCallback(
    (newPercentage: number) => {
      // Validate input early
      if (typeof newPercentage !== 'number' || !isMounted.value) {
        return () => {};
      }

      // Skip animation if value isn't changing significantly
      if (Math.abs(progress.value - newPercentage) < PROGRESS_SKIP_THRESHOLD) {
        return () => {};
      }

      // Set animation state on JS thread
      hasAnimated.current = true;
      isAnimating.value = true;

      // Run animation on UI thread
      runOnUI(() => {
        'worklet';
        // Cancel any ongoing animations before starting a new one
        cancelAnimation(progress);

        // Use withTiming for smooth animation to the new value
        progress.value = withTiming(newPercentage, finalTimingConfig, finished => {
          // Animation is complete
          if (finished && isMounted.value) {
            runOnJS(() => {
              if (isMounted.value) {
                isAnimating.value = false;
              }
            })();
          }
        });
      })();

      // Return cleanup function that cancels the animation if needed
      return () => {
        if (isMounted.value) {
          isAnimating.value = false;
          runOnUI(() => {
            'worklet';
            cancelAnimation(progress);
          })();
        }
      };
    },
    [progress, finalTimingConfig, isMounted]
  );

  // Function to reset progress to initial value
  const reset = useCallback(() => {
      hasAnimated.current = false;
      isAnimating.value = false;

    runOnUI(() => {
      'worklet';
      // Cancel any in-progress animations before resetting
      cancelAnimation(progress);
      progress.value = initialPercentage;
    })();
  }, [progress, initialPercentage]);

  // Create animated style based on the progress value
  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    'worklet';
    // Ensure the value is within valid range
    const clampedValue = Math.max(0, Math.min(PROGRESS_MAX_VALUE, progress.value));
    // Convert the integer value (0-10000) back to a percentage string (0-100%)
    return {
      width: `${clampedValue / 100}%`,
    };
  }, [progress]) as AnimatedStyleProp<ViewStyle>;

  // Reset animation state on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing animations to prevent memory leaks
      isMounted.value = false;
      cancelAnimation(progress);
    hasAnimated.current = false;
    isAnimating.value = false;
    };
  }, [progress, isMounted]);

  return {
    animatedStyle,
    updateProgress,
    progress,
    hasAnimated: () => hasAnimated.current,
    isAnimating: () => isAnimating.value,
    reset,
  };
};
