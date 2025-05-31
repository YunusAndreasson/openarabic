import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { LAYOUT } from '../constants/layout';

import { ThemedText } from './ThemedText';

interface SectionTitleProps {
  title: string;
  containerStyle?: StyleProp<ViewStyle>;
  isFirstSection?: boolean;
}

/**
 * A minimal, refined section title component
 * Clean typography with perfectly balanced spacing
 */
const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  containerStyle,
  isFirstSection = false,
}) => {
  return (
    <View style={[styles.container, isFirstSection && styles.firstSection, containerStyle]}>
      <ThemedText type="heading3" weight="bold" style={styles.titleText}>
        {title}
      </ThemedText>
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default SectionTitle;

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.XXLARGE,
  },
  firstSection: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
  titleText: {
    // Remove the uppercase transformation and custom letter spacing
    // to match the settings screen style
  },
});
