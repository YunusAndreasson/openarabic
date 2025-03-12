import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TIMING_CONFIG } from '../hooks/animations';

interface EntranceAnimationProps {
  /**
   * Children to render inside the animated container
   */
  children: React.ReactNode;

  /**
   * Delay before starting the animation (in ms)
   * @default 50
   */
  delay?: number;

  /**
   * Duration of the animation (in ms)
   * @default TIMING_CONFIG.MEDIUM.duration
   */
  duration?: number;

  /**
   * Additional styles to apply to the container
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * A reusable entrance animation component that fades in content
 * with configurable timing. Use this for consistent entrance animations
 * across the app.
 *
 * This component uses Reanimated 3's built-in FadeIn animation for optimal performance.
 */
const EntranceAnimation = React.memo(
  ({
    children,
    delay = 50,
    duration = TIMING_CONFIG.MEDIUM.duration,
    style,
  }: EntranceAnimationProps) => {
    // Use Reanimated 3's built-in FadeIn animation
    return (
      <Animated.View
        style={[{ flex: 1, width: '100%' }, style]}
        entering={FadeIn.duration(duration).delay(delay)}
      >
        {children}
      </Animated.View>
    );
  }
);

EntranceAnimation.displayName = 'EntranceAnimation';

export default EntranceAnimation;
