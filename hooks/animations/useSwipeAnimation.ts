import { useCallback } from 'react';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

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
export const useSwipeAnimation = (
  initialX = 0,
  threshold = 0.05,
  config: SwipeConfig = { damping: 15, stiffness: 200 }
) => {
  const translateX = useSharedValue(initialX);
  const opacity = useSharedValue(1);

  const swipeThreshold = SCREEN_WIDTH * threshold;

  const swipeRight = useCallback(
    (onComplete?: () => void) => {
      translateX.value = withSpring(
        SCREEN_WIDTH,
        {
          damping: 12,
          stiffness: 250,
          ...config,
        },
        () => {
          if (onComplete) onComplete();
        }
      );
    },
    [translateX, config]
  );

  const swipeLeft = useCallback(
    (onComplete?: () => void) => {
      translateX.value = withSpring(
        -SCREEN_WIDTH,
        {
          damping: config.damping || 15,
          stiffness: config.stiffness || 200,
          mass: config.mass || 1,
        },
        () => {
          if (onComplete) onComplete();
        }
      );
    },
    [translateX, config]
  );

  const resetPosition = useCallback(() => {
    translateX.value = withSpring(0, {
      damping: config.damping || 15,
      stiffness: config.stiffness || 200,
      mass: config.mass || 1,
    });
  }, [translateX, config]);

  const fadeIn = useCallback(
    (duration = 300, onComplete?: () => void) => {
      opacity.value = withTiming(1, { duration }, () => {
        if (onComplete) onComplete();
      });
    },
    [opacity]
  );

  const fadeOut = useCallback(
    (duration = 300, onComplete?: () => void) => {
      opacity.value = withTiming(0, { duration }, () => {
        if (onComplete) onComplete();
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
