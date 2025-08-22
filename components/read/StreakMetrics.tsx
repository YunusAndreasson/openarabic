import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { StreakHistoryData } from '@/services/readingStreak';

interface StreakMetricsProps {
  metrics: StreakHistoryData['metrics'];
}

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}

const MetricCard = memo<MetricCardProps>(({ icon, value, label, color }) => {
  const colors = useColors();

  // Memoize dynamic styles
  const dynamicStyles = useMemo(
    () => ({
      metricCard: {
        backgroundColor: colors.card,
        borderColor: colors.borderOverlay,
      },
      iconContainer: {
        backgroundColor: color + '14',
      },
      metricValue: {
        color,
      },
    }),
    [colors.card, colors.borderOverlay, color]
  );

  return (
    <View
      style={[
        styles.metricCard,
        dynamicStyles.metricCard,
        { borderWidth: LAYOUT.BORDER.WIDTH.THIN },
      ]}
    >
      <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <ThemedText
        type="heading2"
        weight="bold"
        style={[styles.metricValue, dynamicStyles.metricValue]}
      >
        {value}
      </ThemedText>
      <ThemedText type="caption" colorName="textTertiary" style={styles.metricLabel}>
        {label}
      </ThemedText>
    </View>
  );
});

MetricCard.displayName = 'MetricCard';

export const StreakMetrics = memo<StreakMetricsProps>(({ metrics }) => {
  const colors = useColors();

  // Memoize color calculation function
  const getStreakColor = useCallback(
    (streak: number) => {
      if (streak === 0) return colors.textTertiary;
      if (streak >= 30) return colors.success || colors.tint;
      if (streak >= 14) return colors.warning;
      if (streak >= 7) return colors.primary;
      return colors.tint;
    },
    [colors.textTertiary, colors.success, colors.tint, colors.warning, colors.primary]
  );

  // Memoize metric data to prevent recalculation
  const metricData = useMemo(
    () => [
      {
        id: 'current',
        icon: 'flame' as const,
        value: metrics.currentStreak.toString(),
        label: 'Current',
        color: getStreakColor(metrics.currentStreak),
      },
      {
        id: 'longest',
        icon: 'trophy' as const,
        value: metrics.longestStreak.toString(),
        label: 'Best ever',
        color: colors.warning,
      },
      {
        id: 'total',
        icon: 'calendar' as const,
        value: metrics.totalReadingDays.toString(),
        label: `${metrics.totalReadingDays === 1 ? 'Day' : 'Days'} read`,
        color: colors.tint,
      },
    ],
    [
      metrics.currentStreak,
      metrics.longestStreak,
      metrics.totalReadingDays,
      getStreakColor,
      colors.warning,
      colors.tint,
    ]
  );

  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        {metricData.map(metric => (
          <MetricCard
            key={metric.id}
            icon={metric.icon}
            value={metric.value}
            label={metric.label}
            color={metric.color}
          />
        ))}
      </View>
    </View>
  );
});

StreakMetrics.displayName = 'StreakMetrics';

const styles = StyleSheet.create({
  container: {
    // No padding - handled by parent container for perfect alignment
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL, // 8px - balanced card separation
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE, // 16px - generous internal breathing room
    paddingHorizontal: LAYOUT.SPACING.MEDIUM, // 12px - comfortable internal padding
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    ...LAYOUT.ELEVATION.SMALL,
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SMALL, // 32px - proper touch target
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL, // 8px - visual hierarchy spacing
  },
  metricValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE, // Primary metric value
    marginBottom: LAYOUT.SPACING.TINY, // 4px - tight coupling with label
    textAlign: 'center',
  },
  metricLabel: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // Secondary label text
  },
});
