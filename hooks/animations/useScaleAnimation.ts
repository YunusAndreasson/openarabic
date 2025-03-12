import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Hook to create a scale animation
 * @param initialScale - Initial scale value
 * @param targetScale - Target scale value
 * @param duration - Duration of animation in ms
 * @returns Object with animated style and functions to control the animation
 */
export const useScaleAnimation = (
  initialScale = 0.95,
  targetScale = 1,
  duration = TIMING_CONFIG.MEDIUM.duration
) => {
  const scale = useSharedValue(initialScale);

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  const entering = ZoomIn.duration(duration).springify();
  const exiting = ZoomOut.duration(duration).springify();

  const startAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      scale.value = withTiming(
        targetScale,
        {
          duration,
          easing: TIMING_CONFIG.MEDIUM.easing,
        },
        () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        }
      );
    },
    [scale, targetScale, duration]
  );

  const reverseAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      scale.value = withTiming(
        initialScale,
        {
          duration,
          easing: TIMING_CONFIG.MEDIUM.easing,
        },
        () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        }
      );
    },
    [scale, initialScale, duration]
  );

  const reset = useCallback(() => {
    'worklet';
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
    // Export the built-in animations for direct use with Animated.View
    entering,
    exiting,
  };
};
