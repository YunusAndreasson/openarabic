import { useCallback } from 'react';
import { useSharedValue, withSpring, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { SCREEN_WIDTH } from '../../constants/layout';
import { SPRING_CONFIG } from './animationConfigs';

/**
 * Hook to create a slide-in animation
 * @param delay - Delay before animation starts in ms
 * @param damping - Optional override for spring damping
 * @param stiffness - Optional override for spring stiffness
 * @param direction - Direction to slide from ('right' or 'left')
 * @returns Object with animated style and function to start animation
 */
export const useSlideAnimation = (
  delay = 0,
  damping?: number,
  stiffness?: number,
  direction: 'right' | 'left' = 'right'
) => {
  const startPosition = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
  const position = useSharedValue(startPosition);

  const startAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';

      setTimeout(() => {
        position.value = withSpring(
          0,
          {
            ...SPRING_CONFIG.SLIDE,
            ...(damping !== undefined ? { damping } : {}),
            ...(stiffness !== undefined ? { stiffness } : {}),
          },
          () => {
            if (onComplete && runOnJS) {
              runOnJS(onComplete)();
            }
          }
        );
      }, delay);
    },
    [position, delay, damping, stiffness]
  );

  const reset = useCallback(() => {
    'worklet';
    position.value = startPosition;
  }, [position, startPosition]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: position.value }],
    };
  });

  return { animatedStyle, startAnimation, reset, position };
};
