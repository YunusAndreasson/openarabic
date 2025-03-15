import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFadeInEntrance } from '../hooks/animations';

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
 *
 * This component uses the useFadeInEntrance hook for optimal performance.
 */
const AnimatedItem = React.memo(
  ({ children, delay = 0, duration = 400, style }: AnimatedItemProps) => {
    // Use our standardized animation hook
    const { entering } = useFadeInEntrance(delay, duration);

    return (
      <Animated.View style={style} entering={entering}>
        {children}
      </Animated.View>
    );
  }
);

AnimatedItem.displayName = 'AnimatedItem';

export default AnimatedItem;
