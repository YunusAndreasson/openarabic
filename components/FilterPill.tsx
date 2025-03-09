import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFadeInAnimation } from '../hooks/animations';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';

interface FilterPillProps {
  /**
   * Unique identifier for the item
   */
  id: string | number;

  /**
   * Label text to display in the pill
   */
  label: string;

  /**
   * Whether the pill is currently selected
   */
  isSelected?: boolean;

  /**
   * Callback when the pill is selected
   */
  onSelect: (id: string | number) => void;

  /**
   * Animation delay in milliseconds
   */
  animationDelay?: number;
}

/**
 * A reusable filter pill component with animation and selection state
 */
const FilterPill = React.memo(
  ({ id, label, isSelected = false, onSelect, animationDelay = 0 }: FilterPillProps) => {
    const colors = useColors();

    // Use animation hook with consistent timing
    const { animatedStyle, startAnimation } = useFadeInAnimation(
      animationDelay,
      LAYOUT.ANIMATION.DURATION.FAST
    );

    // Memoize the press handler
    const handlePress = useCallback(() => {
      onSelect(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [id, onSelect]);

    // Memoize styles to avoid recalculating on each render
    const pillStyle = useCallback(
      ({ pressed }: { pressed: boolean }) => [
        styles.pill,
        {
          backgroundColor: isSelected
            ? colors.textOverlay
            : pressed
              ? colors.background
              : colors.cardBackground,
        },
        isSelected && styles.pillSelected,
      ],
      [colors, isSelected]
    );

    // Memoize text style
    const textStyle = useMemo(
      () => [styles.pillText, isSelected && [{ color: colors.tint }, styles.boldText]],
      [colors.tint, isSelected]
    );

    React.useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <Animated.View style={animatedStyle}>
        <Pressable style={pillStyle} onPress={handlePress}>
          <ThemedText style={textStyle} numberOfLines={1} ellipsizeMode="tail">
            {label}
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    marginRight: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  pillSelected: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  boldText: {
    fontWeight: 'bold',
  },
});

FilterPill.displayName = 'FilterPill';

export default FilterPill;
