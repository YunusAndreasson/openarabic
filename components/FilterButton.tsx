import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';
import { selectActiveFiltersCount } from '@/store/filtersSlice';
import { useAppSelector } from '@/store/hooks';
import { lightFeedback } from '@/utils/haptics';

interface FilterButtonProps {
  onPress: () => void;
}

const FilterButton = memo(({ onPress }: FilterButtonProps) => {
  const colors = useColors();
  const activeFiltersCount = useAppSelector(selectActiveFiltersCount);

  const handlePress = React.useCallback(() => {
    lightFeedback();
    onPress();
  }, [onPress]);

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          { backgroundColor: colors.transparent },
          activeFiltersCount > 0 && {
            backgroundColor: withOpacity(colors.tint, 0.08),
          },
        ]}
        onPress={handlePress}
      >
        <Ionicons
          name="options-outline"
          size={20}
          color={activeFiltersCount > 0 ? colors.tint : colors.text}
        />

        {activeFiltersCount > 0 && <View style={[styles.dot, { backgroundColor: colors.tint }]} />}
      </Pressable>
    </View>
  );
});

FilterButton.displayName = 'FilterButton';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginRight: LAYOUT.SPACING.TINY,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY,
    right: LAYOUT.SPACING.TINY,
    width: LAYOUT.SPACING.SMALL,
    height: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.SPACING.TINY,
  },
});

export default FilterButton;
