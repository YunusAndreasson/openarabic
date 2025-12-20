import { MetricCard } from '@/components/common/MetricCard';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { StreakHistoryData } from '@/services/studyStreak';

interface StreakMetricsProps {
  metrics: StreakHistoryData['metrics'];
}

export const StreakMetrics = memo<StreakMetricsProps>(({ metrics }) => {
  const colors = useColors();

  // Memoize metric data to prevent recalculation
  const metricData = useMemo(
    () => [
      {
        id: 'current',
        icon: 'flame' as const,
        value: metrics.currentStreak.toString(),
        label: 'Current',
        color: colors.warning,
      },
      {
        id: 'longest',
        icon: 'trophy' as const,
        value: metrics.longestStreak.toString(),
        label: 'Longest',
        color: colors.success, // Green for achievement (universal trophy semantics)
      },
      {
        id: 'total',
        icon: 'calendar' as const,
        value: metrics.totalReadingDays.toString(),
        label: 'Total',
        color: colors.success, // Green for total progress/growth
      },
    ],
    [
      metrics.currentStreak,
      metrics.longestStreak,
      metrics.totalReadingDays,
      colors.warning,
      colors.success,
    ],
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
});
