import { useCallback } from 'react';
import { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Hook to create a slide-in animation
 * @param delay - Delay before animation starts in ms
 * @param damping - Damping for spring animation (higher = less bounce)
 * @param stiffness - Stiffness for spring animation (higher = faster)
 * @param direction - Direction to slide from ('right' or 'left')
 * @returns Object with animated style and function to start animation
 */
export const useSlideAnimation = (
  delay = 0,
  damping = 20,
  stiffness = 100,
  direction: 'right' | 'left' = 'right'
) => {
  const startPosition = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
  const position = useSharedValue(startPosition);

  const startAnimation = useCallback(() => {
    setTimeout(() => {
      position.value = withSpring(0, {
        damping,
        stiffness,
        mass: 0.8,
        overshootClamping: false,
      });
    }, delay);
  }, [position, delay, damping, stiffness]);

  const reset = useCallback(() => {
    position.value = startPosition;
  }, [position, startPosition]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: position.value }],
    };
  });

  return { animatedStyle, startAnimation, reset };
};
