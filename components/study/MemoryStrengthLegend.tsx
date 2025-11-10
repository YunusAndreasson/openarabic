import { memo, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { SortDirection } from '@/hooks/vocabulary/useDictionaryModal';
import { selectionFeedback } from '@/utils/haptics';

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

  return (
    <View style={styles.container}>
      {/* Legend dots on left */}
      <View style={styles.legendRow}>
        {/* Weak - Red */}
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <ThemedText type="caption" variant="secondary" style={styles.label}>
            Weak
          </ThemedText>
        </View>

        {/* Medium - Orange */}
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <ThemedText type="caption" variant="secondary" style={styles.label}>
            Medium
          </ThemedText>
        </View>

        {/* Strong - Green */}
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <ThemedText type="caption" variant="secondary" style={styles.label}>
            Strong
          </ThemedText>
        </View>
      </View>

      {/* Label with sort toggle on right - tappable */}
      <Pressable
        style={({ pressed }) => [styles.headerRow, pressed && { opacity: 0.7 }]}
        onPress={() => {
          selectionFeedback();
          onToggleSort();
        }}
      >
        <ThemedText type="caption" weight="semibold" style={styles.headerText}>
          Memory strength
        </ThemedText>
        <Ionicons
          name={sortDirection === 'desc' ? 'chevron-down' : 'chevron-up'}
          size={14}
          color={colors.secondary}
          style={styles.sortIcon}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // Single row layout
    alignItems: 'center',
    justifyContent: 'space-between', // Dots left, label right
    paddingVertical: LAYOUT.SPACING.MEDIUM, // 12px top/bottom
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING, // 12px left/right
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
  dot: {
    width: LAYOUT.SPACING.SMALL, // 8px
    height: LAYOUT.SPACING.SMALL, // 8px
    borderRadius: LAYOUT.SPACING.TINY, // 4px (circular)
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY, // 4px between text and icon
    marginLeft: LAYOUT.SPACING.MEDIUM, // 12px gap from dots
  },
  headerText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  sortIcon: {
    marginTop: 1, // Optical alignment with text
  },
});

export const MemoryStrengthLegend = memo(MemoryStrengthLegendComponent);

MemoryStrengthLegend.displayName = 'MemoryStrengthLegend';
