import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { SectionTitleProps } from '@/types/ui/layout.types';

/**
 * A consistent section title component used across the app
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
  return (
    <View style={styles.container}>
      <ThemedText type="bodyBold">{title}</ThemedText>
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default React.memo(SectionTitle);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: 0,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});
