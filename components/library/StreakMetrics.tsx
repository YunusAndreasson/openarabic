import { MetricCard } from '@/components/common/MetricCard';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
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
        label: STRINGS.STUDY_STREAK_CURRENT,
        color: colors.warning,
      },
      {
        id: 'longest',
        icon: 'trophy' as const,
        value: metrics.longestStreak.toString(),
        label: STRINGS.STUDY_STREAK_LONGEST,
        color: colors.success, // Green for achievement (universal trophy semantics)
      },
      {
        id: 'total',
        icon: 'calendar' as const,
        value: metrics.totalReadingDays.toString(),
        label: STRINGS.STUDY_STREAK_TOTAL,
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
  );
});

StreakMetrics.displayName = 'StreakMetrics';

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL, // 8px - balanced card separation
  },
});
