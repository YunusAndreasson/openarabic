import { useCallback, useState, useRef, useEffect } from 'react';
import { useSharedValue, withTiming, runOnJS, SharedValue } from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

interface GraphAnimationResult {
  animationProgress: SharedValue<number>;
  skiaProgress: number;
  startAnimation: () => void;
  resetAnimation: () => void;
  isAnimationComplete: boolean;
}

/**
 * Hook to create animations for graph visualizations
 * @param duration - Duration of the animation in ms
 * @returns Object with animation values and functions
 */
export const useGraphAnimation = (duration = TIMING_CONFIG.SLOW.duration): GraphAnimationResult => {
  // Animation progress value for the graph (0 to 1)
  const animationProgress = useSharedValue(0);
  // State to store the current animation value for Skia
  const [skiaProgress, setSkiaProgress] = useState(0);
  // Track if animation has started to avoid restarting
  const hasAnimationStarted = useRef(false);
  // Track if animation is complete
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Function to update Skia progress from Reanimated
  const updateSkiaProgress = useCallback((value: number) => {
    setSkiaProgress(value);
    if (value >= 1) {
      setIsAnimationComplete(true);
    }
  }, []);

  // Start the animation
  const startAnimation = useCallback(() => {
    if (hasAnimationStarted.current) return;

    hasAnimationStarted.current = true;
    setIsAnimationComplete(false);

    // Animate from 0 to 1
    animationProgress.value = withTiming(
      1,
      {
        duration,
        easing: TIMING_CONFIG.SLOW.easing,
      },
      finished => {
        if (finished) {
          runOnJS(updateSkiaProgress)(1);
        }
      }
    );
  }, [animationProgress, duration, updateSkiaProgress]);

  // Reset the animation
  const resetAnimation = useCallback(() => {
    hasAnimationStarted.current = false;
    animationProgress.value = 0;
    setSkiaProgress(0);
    setIsAnimationComplete(false);
  }, [animationProgress]);

  // Set up listener for animation progress
  useEffect(() => {
    // This is a simplified approach - in a real implementation,
    // you might want to use useAnimatedReaction for more control
    const id = setInterval(() => {
      if (hasAnimationStarted.current && !isAnimationComplete) {
        updateSkiaProgress(animationProgress.value);
      }
    }, 16); // ~60fps

    return () => clearInterval(id);
  }, [animationProgress, updateSkiaProgress, isAnimationComplete]);

  return {
    animationProgress,
    skiaProgress,
    startAnimation,
    resetAnimation,
    isAnimationComplete,
  };
};
