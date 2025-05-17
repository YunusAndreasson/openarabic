import React, { memo } from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { LAYOUT } from '../constants/layout';

import SectionTitle from './SectionTitle';

interface SectionProps {
  /**
   * Title to display at the top of the section
   */
  title?: string;

  /**
   * Content of the section
   */
  children: React.ReactNode;

  /**
   * Additional styles for the section
   */
  style?: ViewStyle;

  /**
   * Whether to show the section title
   */
  showTitle?: boolean;

  /**
   * Whether to add horizontal padding to the content
   */
  paddingHorizontal?: boolean;

  /**
   * Whether to animate the section
   */
  animated?: boolean;

  /**
   * Optional delay before the animation starts (ms)
   */
  delay?: number;
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
});

/**
 * Section component that can optionally animate its contents.
 * Falls back to a regular View when no animation is requested.
 */
const Section = memo(
  ({
    title,
    children,
    style,
    showTitle = true,
    paddingHorizontal = false,
    animated = false,
    delay = 0,
  }: SectionProps) => {
    const Container = animated || delay > 0 ? Animated.View : View;
    const content = (
      <>
        {showTitle && title ? <SectionTitle title={title} /> : null}
        {paddingHorizontal ? <View style={styles.paddedContent}>{children}</View> : children}
      </>
    );
    if (Container === Animated.View) {
      return (
        <Animated.View style={style} entering={FadeIn.delay(delay).duration(300)}>
          {content}
        </Animated.View>
      );
    }
    return <View style={style}>{content}</View>;
  }
);

Section.displayName = 'Section';

export default Section;
