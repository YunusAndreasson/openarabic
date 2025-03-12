import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SlideInRight,
  SlideInLeft,
  SlideOutRight,
  SlideOutLeft,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { SCREEN_WIDTH } from '../../constants/layout';
import { SPRING_CONFIG, TIMING_CONFIG } from './animationConfigs';

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

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  const enteringRight = SlideInRight.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const enteringLeft = SlideInLeft.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const exitingRight = SlideOutRight.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const exitingLeft = SlideOutLeft.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const fadeInAnim = FadeIn.duration(TIMING_CONFIG.MEDIUM.duration);
  const fadeOutAnim = FadeOut.duration(TIMING_CONFIG.MEDIUM.duration);

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
    // Export the built-in animations for direct use with Animated.View
    enteringRight,
    enteringLeft,
    exitingRight,
    exitingLeft,
    fadeInAnim,
    fadeOutAnim,
  };
};
