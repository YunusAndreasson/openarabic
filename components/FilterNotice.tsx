import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';

interface FilterNoticeProps {
  /**
   * Type of filter being applied
   */
  type: 'author' | 'category';

  /**
   * Name of the selected filter
   */
  name: string;
}

/**
 * A component that displays what filter is currently applied
 */
const FilterNotice = React.memo(({ type, name }: FilterNoticeProps) => {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.textOverlay }]}>
      <ThemedText style={styles.text}>
        Showing articles from {type === 'author' ? 'author' : 'category'}{' '}
        <ThemedText style={[styles.boldText, { color: colors.tint }]} skipDefaultColor>
          {name}
        </ThemedText>
      </ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: 'bold',
  },
});

FilterNotice.displayName = 'FilterNotice';

export default FilterNotice;
