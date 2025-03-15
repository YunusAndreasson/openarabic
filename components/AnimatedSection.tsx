import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations';
import { LAYOUT } from '../constants/layout';
import SectionTitle from './SectionTitle';
import { AnimatedSectionProps } from '@/types/ui.types';

/**
 * A generic animated section component that fades in with configurable timing
 */
const AnimatedSection = React.memo(
  ({
    title,
    delay = 0,
    duration = LAYOUT.ANIMATION.DURATION.NORMAL,
    children,
    style,
    showTitle = true,
    paddingHorizontal = false,
  }: AnimatedSectionProps) => {
    // Use our custom fade-in animation with standardized duration
    const { animatedStyle, startAnimation } = useFadeInAnimation(delay, duration);

    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <Animated.View style={[style, animatedStyle]}>
        {showTitle && title && <SectionTitle title={title} />}
        {paddingHorizontal ? (
          <View style={{ paddingHorizontal: LAYOUT.SPACING.MEDIUM }}>{children}</View>
        ) : (
          children
        )}
      </Animated.View>
    );
  }
);

AnimatedSection.displayName = 'AnimatedSection';

export default AnimatedSection;
