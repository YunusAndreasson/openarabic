import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useStreakData } from '@/hooks/useStreakData';

import BaseCard from '../../BaseCard';
import { ThemedText } from '../../ThemedText';
import { CardHeader } from '../shared/CardHeader';
import { StatsRow } from '../shared/StatsRow';
import { useChartColors } from '../shared/chartColors';

interface StreakInsightsProps {
  onInfoPress: () => void;
}

export const StreakInsights = memo(({ onInfoPress }: StreakInsightsProps) => {
  const colors = useColors();
  const chartColors = useChartColors();
  const { user } = useAuth();
  const streakData = useStreakData(user?.id);

  // Calculate streak status for visual feedback using consistent color system
  const streakStatus = useMemo(() => {
    const { currentStreak } = streakData;

    if (currentStreak === 0) {
      return { color: colors.textTertiary };
    }
    if (currentStreak >= 7) {
      return { color: chartColors.performance.excellent };
    }
    if (currentStreak >= 3) {
      return { color: chartColors.performance.moderate };
    }
    return { color: chartColors.performance.good };
  }, [streakData, chartColors, colors]);

  // Generate subtitle based on streak
  const subtitle = useMemo(() => {
    const { currentStreak } = streakData;
    if (currentStreak === 0) {
      return 'Start today to begin building consistency';
    }
    if (currentStreak >= 7) {
      return 'Excellent daily consistency!';
    }
    return 'Building momentum';
  }, [streakData.currentStreak]);

  // Activity dots for last 7 days with enhanced styling using consistent colors
  const activityDots = useMemo(() => {
    return streakData.lastSevenDaysActivity.map((day, index) => {
      const isActive = day.active;
      const isToday = index === streakData.lastSevenDaysActivity.length - 1;

      return (
        <View key={`activity-${index}`} style={styles.activityDot}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isActive ? chartColors.streak.active : chartColors.streak.inactive,
                borderWidth: isToday ? 2 : 0,
                borderColor: isToday ? chartColors.streak.today : 'transparent',
                shadowColor: isActive ? chartColors.streak.active : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: isActive ? 2 : 0,
              },
            ]}
          />
          <ThemedText type="caption" variant="subtle" style={styles.dayLabel}>
            {day.dayName}
          </ThemedText>
        </View>
      );
    });
  }, [streakData.lastSevenDaysActivity, chartColors]);

  return (
    <BaseCard style={styles.streakCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.streakContent}>
        <CardHeader title="Streak" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: streakData.currentStreak,
            label: 'current',
            color: streakStatus.color,
          }}
          rightStat={{
            value: streakData.longestStreak,
            label: 'best',
          }}
        />

        {/* Clean activity visualization */}
        <View style={[styles.activitySection, { borderTopColor: chartColors.ui.grid }]}>
          <View style={styles.activityRow}>{activityDots}</View>
        </View>
      </View>
    </BaseCard>
  );
});

StreakInsights.displayName = 'StreakInsights';

const styles = StyleSheet.create({
  streakCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  streakContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  activitySection: {
    borderTopWidth: 1,
    marginTop: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityDot: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  dayLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});
