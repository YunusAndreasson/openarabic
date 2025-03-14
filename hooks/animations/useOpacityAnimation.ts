import { useCallback } from 'react';
import { useSharedValue, withTiming, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';

/**
 * Hook to create a simple opacity animation
 * @param initialOpacity - Initial opacity value (default 1)
 * @param duration - Duration of animation in ms (default from TIMING_CONFIG.MEDIUM)
 * @returns Object with animated style and functions to control opacity animation
 */
export const useOpacityAnimation = (
  initialOpacity = 1,
  duration = TIMING_CONFIG.MEDIUM.duration
) => {
  const opacity = useSharedValue(initialOpacity);

  const fadeIn = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(
        1,
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
    [opacity, duration]
  );

  const fadeOut = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(
        0,
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
    [opacity, duration]
  );

  const setOpacity = useCallback(
    (value: number, onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(
        value,
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
    [opacity, duration]
  );

  const reset = useCallback(() => {
    'worklet';
    opacity.value = initialOpacity;
  }, [opacity, initialOpacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return {
    animatedStyle,
    fadeIn,
    fadeOut,
    setOpacity,
    reset,
    opacity,
  };
};
