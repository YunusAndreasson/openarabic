import { SharedValue } from 'react-native-reanimated';

/**
 * Types of transitions for word review cards
 */
export type TransitionType = 'fade' | 'slide';

/**
 * Creates animation style objects based on transition type
 *
 * Note: This utility is kept for backward compatibility.
 * New components should use Reanimated's useAnimatedStyle directly.
 */
export const getAnimationStyles = (
  fadeOpacity: SharedValue<number>,
  slidePosition: SharedValue<number>,
  transitionType: TransitionType = 'fade'
) => {
  return {
    fadeStyle: {
      opacity: fadeOpacity.value,
    },
    slideStyle: {
      transform: [{ translateX: slidePosition.value }],
    },
    containerStyle:
      transitionType === 'fade'
        ? { opacity: fadeOpacity.value }
        : { transform: [{ translateX: slidePosition.value }] },
  };
};
