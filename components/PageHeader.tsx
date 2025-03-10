import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT, getPlatformTopPadding } from '../constants/layout';
import { useColors } from '../hooks/useColors';

interface PageHeaderProps {
  /**
   * Title text for the header
   */
  title: string;
}

/**
 * A reusable page header component with consistent styling
 */
const PageHeader = React.memo(({ title }: PageHeaderProps) => {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: getPlatformTopPadding(),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
