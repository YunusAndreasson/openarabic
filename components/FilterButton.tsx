import React, { memo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { selectActiveFiltersCount } from '@/store/filtersSlice';
import { useAppSelectorMemo } from '@/store/hooks';
import { withOpacity } from '@/utils/colorUtils';

interface FilterButtonProps {
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FilterButton = memo(({ onPress }: FilterButtonProps) => {
  const colors = useColors();
  const activeFiltersCount = useAppSelectorMemo(selectActiveFiltersCount);
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  const handlePress = React.useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={[
          styles.button,
          { backgroundColor: colors.transparent },
          activeFiltersCount > 0 && {
            backgroundColor: withOpacity(colors.tint, 0.08),
          },
          animatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <ThemedText type="label" weight="medium" colorName="tint" style={styles.filterText}>
          Filter
        </ThemedText>

        {activeFiltersCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.tint }]}>
            <ThemedText
              type="caption"
              weight="bold"
              skipDefaultColor
              style={[styles.badgeText, { color: colors.background }]}
            >
              {activeFiltersCount}
            </ThemedText>
          </View>
        )}
      </AnimatedPressable>
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
    minWidth: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginRight: LAYOUT.SPACING.TINY,
    position: 'relative',
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  filterText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  dot: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY,
    right: LAYOUT.SPACING.TINY,
    width: LAYOUT.SPACING.SMALL,
    height: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.SPACING.TINY,
  },
  badge: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY - 2,
    right: LAYOUT.SPACING.TINY - 2,
    minWidth: 16,
    height: 16,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export default FilterButton;
