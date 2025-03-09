import React, { useCallback, useMemo, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFadeInAnimation } from '../hooks/animations';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';

interface AnimatedPillProps {
  /**
   * Unique identifier for the item
   */
  item: string;

  /**
   * Whether the pill is currently selected
   */
  isSelected?: boolean;

  /**
   * Callback when the pill is selected
   */
  onSelect: (value: string) => void;

  /**
   * Display text for the pill
   */
  label: string;

  /**
   * Animation delay in milliseconds
   */
  delay: number;
}

/**
 * A animated pill component for filters with selection state
 */
const AnimatedPill = React.memo(
  ({ item, isSelected, onSelect, label, delay }: AnimatedPillProps) => {
    const colors = useColors();

    // Use consistent animation timing from LAYOUT constants
    const { animatedStyle, startAnimation } = useFadeInAnimation(
      delay,
      LAYOUT.ANIMATION.DURATION.FAST
    );

    // Memoize the press handler to avoid recreating it on each render
    const handlePress = useCallback(() => {
      onSelect(item);
      // Optional: Add haptic feedback for better UX
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [item, onSelect]);

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

    useEffect(() => {
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

AnimatedPill.displayName = 'AnimatedPill';

export default AnimatedPill;
