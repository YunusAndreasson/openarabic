import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations';

interface AnimatedItemProps {
  /**
   * Children to render inside the animated container
   */
  children: React.ReactNode;

  /**
   * Delay before starting the animation (in ms)
   * @default 0
   */
  delay?: number;

  /**
   * Duration of the animation (in ms)
   * @default 400
   */
  duration?: number;

  /**
   * Additional styles to apply to the container
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * A reusable animated item component that fades in with configurable timing.
 * Useful for list items, completion items, or any element that needs to
 * appear with a fade-in animation.
 */
const AnimatedItem = React.memo(
  ({ children, delay = 0, duration = 400, style }: AnimatedItemProps) => {
    // Use the existing fade in animation hook
    const { animatedStyle, startAnimation } = useFadeInAnimation(0, duration);

    // Start animations when component mounts
    useEffect(() => {
      setTimeout(() => {
        startAnimation();
      }, delay);
    }, [startAnimation, delay]);

    return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
  }
);

AnimatedItem.displayName = 'AnimatedItem';

export default AnimatedItem;
