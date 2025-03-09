import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations';
import { LAYOUT } from '../constants/layout';
import SectionTitle from './SectionTitle';

interface AnimatedSectionProps {
  /**
   * Title to display at the top of the section
   */
  title?: string;

  /**
   * Delay before starting the animation (in ms)
   */
  delay?: number;

  /**
   * Duration of the animation (in ms)
   */
  duration?: number;

  /**
   * Children to render inside the section
   */
  children: React.ReactNode;

  /**
   * Additional styles to apply to the section container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Whether to show the section title
   */
  showTitle?: boolean;

  /**
   * Whether to add horizontal padding to the content
   */
  paddingHorizontal?: boolean;
}

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
