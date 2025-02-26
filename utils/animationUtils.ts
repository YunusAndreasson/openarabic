import { Animated } from 'react-native';

/**
 * Types of transitions for word review cards
 */
export type TransitionType = 'fade' | 'slide';

interface AnimationConfig {
  fadeOpacity: Animated.Value;
  slidePosition: Animated.Value;
  screenWidth: number;
}

/**
 * Resets animation values to their initial state
 */
export const resetAnimations = (config: AnimationConfig): void => {
  config.fadeOpacity.setValue(0);
  config.slidePosition.setValue(config.screenWidth);
};

/**
 * Starts the appropriate animation based on transition type
 * @param config Animation configuration
 * @param transitionType Type of transition to perform
 * @param duration Duration of the animation in milliseconds
 * @returns Promise that resolves when animation completes
 */
export const startAnimation = (
  config: AnimationConfig,
  transitionType: TransitionType = 'fade',
  duration: number = 300
): Promise<void> => {
  // Reset animations to initial state
  resetAnimations(config);

  return new Promise(resolve => {
    // Determine which animation to run based on transition type
    if (transitionType === 'fade') {
      // For correct answers - fade in place
      Animated.timing(config.fadeOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(() => resolve());
    } else {
      // For incorrect answers - slide in from right
      Animated.spring(config.slidePosition, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start(() => resolve());
    }
  });
};

/**
 * Creates animation style objects based on transition type
 */
export const getAnimationStyles = (
  config: AnimationConfig,
  transitionType: TransitionType = 'fade'
) => {
  return {
    fadeStyle: {
      opacity: config.fadeOpacity,
    },
    slideStyle: {
      transform: [{ translateX: config.slidePosition }],
    },
    containerStyle:
      transitionType === 'fade'
        ? { opacity: config.fadeOpacity }
        : { transform: [{ translateX: config.slidePosition }] },
  };
};
