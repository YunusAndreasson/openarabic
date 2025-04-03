import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { SectionTitleProps } from '@/types/ui/layout.types';

/**
 * A minimal, refined section title component
 * Clean typography with perfectly balanced spacing
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ title, containerStyle }) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <ThemedText type="label" colorName="text" style={styles.titleText}>
        {title}
      </ThemedText>
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default React.memo(SectionTitle);

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
