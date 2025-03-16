import React from 'react';
import Animated from 'react-native-reanimated';
import { TIMING_CONFIG, useFadeInEntrance } from '../hooks/animations';
import { EntranceAnimationProps } from '@/types/ui.types';

/**
 * A reusable entrance animation component that fades in content
 * with configurable timing. Use this for consistent entrance animations
 * across the app.
 *
 * This component uses the useFadeInEntrance hook for optimal performance.
 */
const EntranceAnimation = React.memo(
  ({
    children,
    delay = 0,
    duration = TIMING_CONFIG.FAST.duration,
    style,
  }: EntranceAnimationProps) => {
    // Use our standardized animation hook
    const { entering } = useFadeInEntrance(delay, duration);

    return (
      <Animated.View style={[{ flex: 1, width: '100%' }, style]} entering={entering}>
        {children}
      </Animated.View>
    );
  }
);

EntranceAnimation.displayName = 'EntranceAnimation';

export default EntranceAnimation;
