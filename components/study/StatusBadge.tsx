import { memo, useMemo, type FC } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

export type BadgeType = 'due' | 'learned' | 'mastered' | 'extraHard';

interface StatusBadgeProps {
  type: BadgeType;
  label?: string; // Optional custom label, defaults based on type
}

const DEFAULT_LABELS: Record<BadgeType, string> = {
  due: 'Due',
  learned: 'Learned',
  mastered: 'Mastered',
  extraHard: 'Hard',
} as const;

/**
 * StatusBadge - Compact pill-shaped badge for word status indication
 * Used in Dictionary to show Due/Learned/Mastered/Extra Hard states
 *
 * Design: Follows Pill component patterns with semantic colors from theme
 */
export const StatusBadge: FC<StatusBadgeProps> = memo(({ type, label }) => {
  const colors = useColors();

  // Get semantic background color based on badge type
  const backgroundColor = useMemo(() => {
    switch (type) {
      case 'due':
        return colors.warning; // Amber - urgent attention
      case 'learned':
        return colors.success; // Green - positive progress
      case 'mastered':
        return colors.tint; // Sage green - primary achievement
      case 'extraHard':
        return colors.error; // Red - critical attention
    }
  }, [type, colors]);

  // Container style with semantic background color and elevation
  const containerStyle = useMemo(
    () => ({
      paddingHorizontal: LAYOUT.SPACING.SMALL,
      paddingVertical: LAYOUT.SPACING.MICRO, // Compact vertical padding (2px)
      borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM, // Match Pill component
      alignSelf: 'flex-start' as const, // Shrink to content width
      backgroundColor,
      shadowColor: colors.shadow,
      ...LAYOUT.ELEVATION.SUBTLE, // Subtle depth like Pill
    }),
    [backgroundColor, colors.shadow]
  );

  const badgeLabel = label ?? DEFAULT_LABELS[type];

  return (
    <View style={containerStyle}>
      <ThemedText
        type="caption"
        weight="semibold"
        colorName="background" // High contrast on colored backgrounds (theme-aware)
      >
        {badgeLabel}
      </ThemedText>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';
