import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
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

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderOverlay,
          borderWidth: LAYOUT.BORDER.WIDTH.THIN,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <ThemedText type="heading2" weight="bold" style={[styles.metricValue, { color }]}>
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

  const getStreakColor = (streak: number) => {
    if (streak === 0) return colors.textTertiary;
    if (streak >= 30) return colors.success || colors.tint;
    if (streak >= 14) return colors.warning;
    if (streak >= 7) return colors.primary;
    return colors.tint;
  };

  const formatDaysLabel = (count: number) => {
    return count === 1 ? 'day' : 'days';
  };

  const currentStreakColor = getStreakColor(metrics.currentStreak);

  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        <MetricCard
          icon="flame"
          value={metrics.currentStreak.toString()}
          label="Current streak"
          color={currentStreakColor}
        />

        <MetricCard
          icon="trophy"
          value={metrics.longestStreak.toString()}
          label="Best streak"
          color={colors.warning}
        />

        <MetricCard
          icon="calendar"
          value={metrics.totalReadingDays.toString()}
          label={`Total ${formatDaysLabel(metrics.totalReadingDays)}`}
          color={colors.tint}
        />
      </View>
    </View>
  );
});

StreakMetrics.displayName = 'StreakMetrics';

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    ...LAYOUT.ELEVATION.SMALL,
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  metricValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  metricLabel: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});
