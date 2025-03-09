import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { SPRING_CONFIG, TIMING_CONFIG } from './animationConfigs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwipeConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
}

/**
 * Hook to create swipe animations for cards
 * @param initialX - Initial X position
 * @param threshold - Threshold to trigger swipe action (percentage of screen width)
 * @param config - Spring animation configuration
 * @returns Object with animated style and functions to control the swipe
 */
export const useSwipeAnimation = (initialX = 0, threshold = 0.05, config: SwipeConfig = {}) => {
  const translateX = useSharedValue(initialX);
  const opacity = useSharedValue(1);

  const swipeThreshold = SCREEN_WIDTH * threshold;

  const swipeRight = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      translateX.value = withSpring(
        SCREEN_WIDTH,
        {
          ...SPRING_CONFIG.CARD,
          damping: 12, // Slightly lower damping for more "fling" effect
          stiffness: 250, // Higher stiffness for faster movement
          ...config,
        },
        () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        }
      );
    },
    [translateX, config]
  );

  const swipeLeft = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      translateX.value = withSpring(
        -SCREEN_WIDTH,
        {
          ...SPRING_CONFIG.CARD,
          ...config,
        },
        () => {
          if (onComplete && runOnJS) {
            runOnJS(onComplete)();
          }
        }
      );
    },
    [translateX, config]
  );

  const resetPosition = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0, {
      ...SPRING_CONFIG.CARD,
      ...config,
    });
  }, [translateX, config]);

  const fadeIn = useCallback(
    (duration = TIMING_CONFIG.MEDIUM.duration, onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(1, { duration }, () => {
        if (onComplete && runOnJS) {
          runOnJS(onComplete)();
        }
      });
    },
    [opacity]
  );

  const fadeOut = useCallback(
    (duration = TIMING_CONFIG.MEDIUM.duration, onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(0, { duration }, () => {
        if (onComplete && runOnJS) {
          runOnJS(onComplete)();
        }
      });
    },
    [opacity]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  return {
    animatedStyle,
    translateX,
    opacity,
    swipeRight,
    swipeLeft,
    resetPosition,
    fadeIn,
    fadeOut,
    swipeThreshold,
  };
};
