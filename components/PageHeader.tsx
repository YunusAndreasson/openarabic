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
  const colors = useColors();

  // Memoize styles that use colors to prevent new object creation on each render
  const borderStyle = useMemo(
    () => ({ borderBottomColor: colors.cardBorder }),
    [colors.cardBorder]
  );

  return (
    <View style={[styles.container, borderStyle]}>
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: getPlatformTopPadding(),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
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
