import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';
import type { DailyReadingActivity, StreakPeriod } from '@/services/studyStreak';

interface StreakChartProps {
  dailyActivity: DailyReadingActivity[];
  streakPeriods: StreakPeriod[];
  height?: number;
}

const CHART_HEIGHT = LAYOUT.CHART.HEIGHT; // 60 via constants
const BAR_HEIGHT = LAYOUT.BUTTON.HEIGHT.LARGE / 2; // ~24 via constants
const BAR_RADIUS = LAYOUT.BORDER_RADIUS.SMALL; // ~8 via constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_GAP = LAYOUT.CHART.BAR_GAP; // 2 via constants

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
      // Calculate available width (screen width minus padding)
      const availableWidth = SCREEN_WIDTH - LAYOUT.SPACING.XLARGE * 2;

      // Calculate bar width to fit all bars without scrolling
      // Total width = (barCount * barWidth) + ((barCount - 1) * gap)
      // Solving for barWidth: barWidth = (availableWidth - (barCount - 1) * gap) / barCount
      const calculatedBarWidth =
        (availableWidth - (dailyActivity.length - 1) * BAR_GAP) / dailyActivity.length;

      // Use calculated width, with a minimum of 6px for visibility
      const barWidth = Math.max(6, calculatedBarWidth);

      // Calculate actual chart width used
      const chartWidth = dailyActivity.length * barWidth + (dailyActivity.length - 1) * BAR_GAP;

      // Create streak map
      const streakMap = createStreakMap(streakPeriods);

      // Generate bars for each day with X positions
      const bars = dailyActivity.map((activity, index) => {
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

        // Calculate X position for this bar
        const x = index * (barWidth + BAR_GAP);

        // Convert to RGBA color for Skia
        const color = withOpacity(barColor, barOpacity);

        return {
          key: activity.date,
          x,
          color,
        };
      });

      // Border color for today's bar (subtle highlight)
      const todayBorderColor = withOpacity(colors.text, 0.3);

      return {
        chartWidth,
        barWidth,
        bars,
        todayBorderColor,
      };
    }, [dailyActivity, streakPeriods, colors.warning, colors.tint, colors.textTertiary, colors.text]);

    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.chartArea}>
          <Canvas
            style={{
              width: chartData.chartWidth,
              height: BAR_HEIGHT,
            }}
          >
            {chartData.bars.map(bar => (
              <RoundedRect
                key={bar.key}
                x={bar.x}
                y={0}
                width={chartData.barWidth}
                height={BAR_HEIGHT}
                r={BAR_RADIUS}
                color={bar.color}
              />
            ))}
            {/* Subtle border for today's bar */}
            {chartData.bars.length > 0 && (
              <RoundedRect
                x={chartData.bars[chartData.bars.length - 1]?.x ?? 0}
                y={0}
                width={chartData.barWidth}
                height={BAR_HEIGHT}
                r={BAR_RADIUS}
                color={chartData.todayBorderColor}
                style="stroke"
                strokeWidth={1.5}
              />
            )}
          </Canvas>
        </View>
      </View>
    );
  },
);

StreakChart.displayName = 'StreakChart';

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.TINY,
    justifyContent: 'center',
  },
  chartArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
