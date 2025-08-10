import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { selectActiveFiltersCount } from '@/store/filtersSlice';
import { useAppSelectorMemo } from '@/store/hooks';

interface FilterButtonProps {
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FilterButton = memo(({ onPress }: FilterButtonProps) => {
  const colors = useColors();
  const activeFiltersCount = useAppSelectorMemo(selectActiveFiltersCount);
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={[styles.button, { backgroundColor: colors.transparent }, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      >
        <ThemedText type="label" weight="semibold" colorName="tint" style={styles.filterText}>
          {STRINGS.FILTER}
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
  badge: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY / 2,
    right: LAYOUT.SPACING.TINY / 2,
    minWidth: LAYOUT.SPACING.LARGE,
    minHeight: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.SPACING.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  badgeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});

export default FilterButton;
