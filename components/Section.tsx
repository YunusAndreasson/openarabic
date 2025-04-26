import React, { memo } from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';

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
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
});

/**
 * A non-animated section component that replaces AnimatedSection for better performance
 * when animations aren't needed
 */
const Section = memo(
  ({ title, children, style, showTitle = true, paddingHorizontal = false }: SectionProps) => {
    return (
      <View style={style}>
        {showTitle && title ? <SectionTitle title={title} /> : null}
        {paddingHorizontal ? <View style={styles.paddedContent}>{children}</View> : children}
      </View>
    );
  }
);

Section.displayName = 'Section';

export default Section;
