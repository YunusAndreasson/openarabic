import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { SectionTitleProps } from '@/types/ui.types';

/**
 * A consistent section title component used across the app
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.text}>{title}</ThemedText>
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default React.memo(SectionTitle);

const styles = StyleSheet.create({
  container: {
    marginLeft: LAYOUT.SCREEN_EDGE_PADDING,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
