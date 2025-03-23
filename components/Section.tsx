import React from 'react';
import { View, ViewStyle } from 'react-native';
import SectionTitle from './SectionTitle';
import { LAYOUT } from '../constants/layout';

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

/**
 * A non-animated section component that replaces AnimatedSection for better performance
 * when animations aren't needed
 */
const Section = React.memo(
  ({ title, children, style, showTitle = true, paddingHorizontal = false }: SectionProps) => {
    return (
      <View style={style}>
        {showTitle && title && <SectionTitle title={title} />}
        {paddingHorizontal ? (
          <View style={{ paddingHorizontal: LAYOUT.SPACING.MEDIUM }}>{children}</View>
        ) : (
          children
        )}
      </View>
    );
  }
);

Section.displayName = 'Section';

export default Section;
