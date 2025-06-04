import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useStreakData } from '@/hooks/useStreakData';

import { BaseChart, ChartCanvas, type DataPoint } from '../shared';
import { ThemedText } from '../../ThemedText';
import { useChartColors } from '../shared/chartColors';
import { LAYOUT } from '@/constants/layout';

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

  // Prepare data points for interactive tooltips on activity dots
  const dataPoints: DataPoint[] = useMemo(() => {
    const dotWidth = 50; // Approximate width per dot
    const containerWidth = 300; // Approximate container width
    const spacing = containerWidth / streakData.lastSevenDaysActivity.length;

    return streakData.lastSevenDaysActivity.map((day, index) => {
      const x = index * spacing + spacing / 2;
      const y = 20; // Center of dots

      return {
        x,
        y,
        value: day.active ? 'Active' : 'Inactive',
        label: `${day.dayName}: ${day.active ? 'Studied' : 'No study'}`,
        data: day,
      };
    });
  }, [streakData.lastSevenDaysActivity]);

  // Activity dots for last 7 days with enhanced styling using consistent colors
  const activityDots = useMemo(() => {
    return streakData.lastSevenDaysActivity.map((day, index) => {
      const isActive = day.active;
      const isToday = index === streakData.lastSevenDaysActivity.length - 1;

      return (
        <View key={`activity-${index}`} style={styles.activityDot}>
          <TouchableOpacity
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
            accessible={true}
            accessibilityLabel={`${day.dayName}: ${day.active ? 'Active day' : 'Inactive day'}`}
            accessibilityRole="button"
          />
          <ThemedText type="caption" variant="subtle" style={styles.dayLabel}>
            {day.dayName}
          </ThemedText>
        </View>
      );
    });
  }, [streakData.lastSevenDaysActivity, chartColors]);

  const hasStreakData = streakData.lastSevenDaysActivity.length > 0;

  return (
    <BaseChart
      title="Streak"
      subtitle={subtitle}
      onInfoPress={onInfoPress}
      hasData={hasStreakData}
      leftStat={{
        value: streakData.currentStreak,
        label: 'current',
        color: streakStatus.color,
      }}
      rightStat={{
        value: streakData.longestStreak,
        label: 'best',
        color: chartColors.performance.excellent,
      }}
      contentHeight={100}
      emptyStateText="Start studying to track your streak"
    >
      <ChartCanvas
        dataPoints={dataPoints}
        enableTooltips={true}
        height={100}
        accessibilityLabel="Weekly activity streak showing last 7 days of study progress"
      >
        {/* Clean activity visualization */}
        <View style={[styles.activitySection, { borderTopColor: chartColors.ui.grid }]}>
          <View style={styles.activityRow}>{activityDots}</View>
        </View>
      </ChartCanvas>
    </BaseChart>
  );
});

StreakInsights.displayName = 'StreakInsights';

const styles = StyleSheet.create({
  activitySection: {
    marginTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    textAlign: 'center',
  },
});
