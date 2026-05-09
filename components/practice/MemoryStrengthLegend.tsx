import { memo, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/ThemedText';
import { ColorDot } from '@/components/ui/ColorDot';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { PRESS_ANIMATION_BUTTON, usePressAnimation } from '@/hooks/animations';
import type { SortDirection } from '@/hooks/vocabulary/useDictionaryModal';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MemoryStrengthLegendProps {
  sortDirection: SortDirection;
  onToggleSort: () => void;
}

/**
 * Memory strength legend with colored dot indicators
 * Shows what each dot color means for memory strength levels
 * Scrolls with list content (not sticky)
 * Single row: dots on left, label with sort toggle on right
 */
const MemoryStrengthLegendComponent: FC<MemoryStrengthLegendProps> = ({
  sortDirection,
  onToggleSort,
}) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(PRESS_ANIMATION_BUTTON);

  return (
    <View style={styles.container}>
      {/* Legend dots on left */}
      <View style={styles.legendRow}>
        {/* Weak - Red */}
        <View style={styles.legendItem}>
          <ColorDot color={colors.error} />
          <ThemedText type="caption" colorName="subtleLabelText">
            Weak
          </ThemedText>
        </View>

        {/* Medium - Orange */}
        <View style={styles.legendItem}>
          <ColorDot color={colors.warning} />
          <ThemedText type="caption" colorName="subtleLabelText">
            Medium
          </ThemedText>
        </View>

        {/* Strong - Green */}
        <View style={styles.legendItem}>
          <ColorDot color={colors.success} />
          <ThemedText type="caption" colorName="subtleLabelText">
            Strong
          </ThemedText>
        </View>
      </View>

      {/* Label with sort toggle on right — Reanimated press-scale matches FAB */}
      <AnimatedPressable
        style={[styles.headerRow, animatedStyle]}
        onPress={onToggleSort}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <ThemedText type="caption" colorName="subtleLabelText" weight="semibold">
          {STRINGS.MEMORY_STRENGTH}
        </ThemedText>
        <Ionicons
          name={sortDirection === 'desc' ? 'chevron-down' : 'chevron-up'}
          size={14}
          color={colors.secondary}
          style={styles.sortIcon}
        />
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // Single row layout
    alignItems: 'center',
    justifyContent: 'space-between', // Dots left, label right
    paddingVertical: LAYOUT.SPACING.MEDIUM, // 12px top/bottom
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING, // 12px left/right
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM, // 12px between legend items
    flex: 1, // Take available space on left
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY, // 4px between dot and label
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY, // 4px between text and icon
    marginLeft: LAYOUT.SPACING.MEDIUM, // 12px gap from dots
  },
  sortIcon: {
    marginTop: 1, // Optical alignment with text
  },
});

export const MemoryStrengthLegend = memo(MemoryStrengthLegendComponent);

MemoryStrengthLegend.displayName = 'MemoryStrengthLegend';
