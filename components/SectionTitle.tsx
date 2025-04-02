import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { SectionTitleProps } from '@/types/ui/layout.types';

/**
 * A consistent section title component used across the app
 * Enhanced to be visually distinct from regular content titles
 * while maintaining proper visual hierarchy
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleWrapper}>
        {/* Accent line removed */}

        {/* Title text with specialized styling */}
        <ThemedText type="bodyBold" colorName="text" skipDefaultColor style={styles.titleText}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default React.memo(SectionTitle);

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },
});
