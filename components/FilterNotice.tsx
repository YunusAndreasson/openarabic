import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { capitalizeFirstLetter } from '../utils/stringUtils';
import { FilterNoticeProps } from '@/types/ui.types';

/**
 * A component that displays what filter is currently applied
 */
const FilterNotice = React.memo(({ type, name }: FilterNoticeProps) => {
  const colors = useColors();

  // Format the name based on the filter type
  const formattedName = type === 'category' ? capitalizeFirstLetter(name.toLowerCase()) : name;

  // Memoize styles that use colors to prevent new object creation on each render
  const containerStyle = useMemo(
    () => ({ backgroundColor: colors.textOverlay }),
    [colors.textOverlay]
  );

  const tintTextStyle = useMemo(() => ({ color: colors.tint }), [colors.tint]);

  return (
    <View style={[styles.container, containerStyle]}>
      <ThemedText style={styles.text}>
        Showing articles from {type === 'author' ? 'author' : 'category'}{' '}
        <ThemedText style={[styles.boldText, tintTextStyle]} skipDefaultColor>
          {formattedName}
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
