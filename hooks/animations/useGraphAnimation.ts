import { useCallback, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

import { TIMING_CONFIG } from './animationConfigs';

interface GraphAnimationResult {
  animationProgress: SharedValue<number>;
  startAnimation: () => void;
  resetAnimation: () => void;
  isAnimationComplete: boolean;
}

/**
 * Hook to create animations for graph visualizations
 * Returns a Reanimated shared value that can be used with Skia's useValue
 * @param duration - Duration of the animation in ms
 * @returns Object with animation values and functions
 */
export const useGraphAnimation = (duration = TIMING_CONFIG.SLOW.duration): GraphAnimationResult => {
  // Animation progress value for the graph (0 to 1)
  const animationProgress = useSharedValue(0);
  // Track if animation has started to avoid restarting
  const hasAnimationStarted = useRef(false);
  // Track if animation is complete
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Start the animation
  const startAnimation = useCallback(() => {
    'worklet';
    if (hasAnimationStarted.current) return;

    hasAnimationStarted.current = true;
    runOnJS(setIsAnimationComplete)(false);

    // Animate from 0 to 1
    animationProgress.value = withTiming(
      1,
      {
        duration,
        easing: TIMING_CONFIG.SLOW.easing,
      },
      finished => {
        if (finished) {
          runOnJS(setIsAnimationComplete)(true);
        }
      }
    );
  }, [animationProgress, duration, setIsAnimationComplete]);

  // Reset the animation
  const resetAnimation = useCallback(() => {
    'worklet';
    hasAnimationStarted.current = false;
    animationProgress.value = 0;
    runOnJS(setIsAnimationComplete)(false);
  }, [animationProgress, setIsAnimationComplete]);

  return {
    animationProgress,
    startAnimation,
    resetAnimation,
    isAnimationComplete,
  };
};
