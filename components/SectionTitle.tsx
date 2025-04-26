import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { LAYOUT } from '../constants/layout';

import { ThemedText } from './ThemedText';

interface SectionTitleProps {
  title: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * A minimal, refined section title component
 * Clean typography with perfectly balanced spacing
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ title, containerStyle }) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <ThemedText type="label" colorName="text" weight="semibold" style={styles.titleText}>
        {title}
      </ThemedText>
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default memo(SectionTitle);

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
