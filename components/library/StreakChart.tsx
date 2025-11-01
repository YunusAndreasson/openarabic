import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { DailyReadingActivity, StreakPeriod } from '@/services/studyStreak';

interface StreakChartProps {
  dailyActivity: DailyReadingActivity[];
  streakPeriods: StreakPeriod[];
  height?: number;
}

const CHART_HEIGHT = 60;
const BAR_HEIGHT = LAYOUT.BUTTON.HEIGHT.LARGE / 2; // ~24 via constants
const BAR_RADIUS = LAYOUT.BORDER_RADIUS.SMALL; // ~8
const SCREEN_WIDTH = Dimensions.get('window').width;

// Extract expensive calculations outside component
const createStreakMap = (streakPeriods: StreakPeriod[]): Map<string, StreakPeriod> => {
  const map = new Map<string, StreakPeriod>();
  streakPeriods.forEach(period => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    // Mark all dates in this period using UTC for consistent timezone handling
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toISOString()
        .split('T')[0];
      if (dateStr) {
        map.set(dateStr, period);
      }
    }
  });
  return map;
};

export const StreakChart = memo<StreakChartProps>(
  ({ dailyActivity, streakPeriods, height = CHART_HEIGHT }) => {
    const colors = useColors();

    // Memoize expensive calculations
    const chartData = useMemo(() => {
      // Calculate bar width based on available space
      const chartWidth = SCREEN_WIDTH - LAYOUT.SPACING.XLARGE * 2;
      const barWidth = Math.max(
        8,
        (chartWidth - (dailyActivity.length - 1) * 2) / dailyActivity.length,
      );

      // Create streak map
      const streakMap = createStreakMap(streakPeriods);

      // Generate bars for each day
      const bars = dailyActivity.map(activity => {
        const hasActivity = activity.hasActivity;
        const streakPeriod = streakMap.get(activity.date);
        const isInStreak = Boolean(streakPeriod);
        const isActiveStreak = streakPeriod?.isActive || false;

        // Determine bar color and opacity
        let barColor = colors.textTertiary;
        let barOpacity = 0.2;

        if (hasActivity) {
          if (isActiveStreak) {
            barColor = colors.warning; // Orange for active streak (matches Current badge)
            barOpacity = 1;
          } else if (isInStreak) {
            barColor = colors.warning; // Dimmed orange for past streaks
            barOpacity = 0.6;
          } else {
            barColor = colors.tint; // Sage green for isolated active days
            barOpacity = 0.8;
          }
        }

        return {
          key: activity.date,
          barColor,
          barOpacity,
        };
      });

      return {
        chartWidth,
        barWidth,
        bars,
      };
    }, [dailyActivity, streakPeriods, colors.warning, colors.tint, colors.textTertiary]);

    // Memoize static styles
    const staticStyles = useMemo(
      () => ({
        barsContainer: { width: chartData.chartWidth },
      }),
      [chartData.chartWidth],
    );

    return (
      <View style={[styles.container, { height }]}>
        {/* Chart area */}
        <View style={styles.chartArea}>
          <View style={[styles.barsContainer, staticStyles.barsContainer]}>
            {chartData.bars.map(bar => (
              <View
                key={bar.key}
                style={[
                  styles.bar,
                  {
                    width: chartData.barWidth,
                    height: BAR_HEIGHT,
                    backgroundColor: bar.barColor,
                    opacity: bar.barOpacity,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  },
);

StreakChart.displayName = 'StreakChart';

const styles = StyleSheet.create({
  container: {
    // Remove paddingHorizontal since it's handled by parent chartContainer
    paddingVertical: LAYOUT.SPACING.TINY, // Minimal vertical padding for tight layout
  },
  chartArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: BAR_HEIGHT,
  },
  bar: {
    borderRadius: BAR_RADIUS,
  },
});
