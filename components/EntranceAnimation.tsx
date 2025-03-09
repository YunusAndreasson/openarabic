import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations';
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
 */
const EntranceAnimation = React.memo(
  ({
    children,
    delay = 50,
    duration = TIMING_CONFIG.MEDIUM.duration,
    style,
  }: EntranceAnimationProps) => {
    // Use the existing fade in animation hook
    const { animatedStyle, startAnimation } = useFadeInAnimation(0, duration);

    // Start animations when component mounts
    useEffect(() => {
      // Start the animation with the specified delay
      setTimeout(() => {
        startAnimation(0);
      }, delay);
    }, [startAnimation, delay]);

    return (
      <Animated.View style={[{ flex: 1, width: '100%' }, style, animatedStyle]}>
        {children}
      </Animated.View>
    );
  }
);

EntranceAnimation.displayName = 'EntranceAnimation';

export default EntranceAnimation;
