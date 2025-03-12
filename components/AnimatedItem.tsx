import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

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
 * This component uses Reanimated 3's built-in FadeIn animation for optimal performance.
 */
const AnimatedItem = React.memo(
  ({ children, delay = 0, duration = 400, style }: AnimatedItemProps) => {
    // Use Reanimated 3's built-in FadeIn animation
    return (
      <Animated.View style={style} entering={FadeIn.duration(duration).delay(delay)}>
        {children}
      </Animated.View>
    );
  }
);

AnimatedItem.displayName = 'AnimatedItem';

export default AnimatedItem;
