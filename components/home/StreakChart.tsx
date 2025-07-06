import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { DailyReadingActivity, StreakPeriod } from '@/services/readingStreak';

interface StreakChartProps {
  dailyActivity: DailyReadingActivity[];
  streakPeriods: StreakPeriod[];
  height?: number;
}

const CHART_HEIGHT = 60;
const BAR_HEIGHT = 24;
const BAR_RADIUS = 4;
const SCREEN_WIDTH = Dimensions.get('window').width;

export const StreakChart = memo<StreakChartProps>(
  ({ dailyActivity, streakPeriods, height = CHART_HEIGHT }) => {
    const colors = useColors();

    // Create a map of streak periods for efficient lookup
    const streakMap = useMemo(() => {
      const map = new Map<string, StreakPeriod>();
      streakPeriods.forEach(period => {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);

        // Mark all dates in this period
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (dateStr) {
            map.set(dateStr, period);
          }
        }
      });
      return map;
    }, [streakPeriods]);

    // Calculate bar width based on available space (matching StreakMetrics padding)
    const chartWidth = SCREEN_WIDTH - LAYOUT.SPACING.LARGE * 2;
    const barWidth = Math.max(
      8,
      (chartWidth - (dailyActivity.length - 1) * 2) / dailyActivity.length
    );

    // Generate bars for each day
    const bars = useMemo(() => {
      return dailyActivity.map(activity => {
        const hasActivity = activity.hasActivity;
        const streakPeriod = streakMap.get(activity.date);
        const isInStreak = !!streakPeriod;
        const isActiveStreak = streakPeriod?.isActive || false;

        // Determine bar color and opacity
        let barColor = colors.textTertiary;
        let barOpacity = 0.2;

        if (hasActivity) {
          if (isActiveStreak) {
            barColor = colors.warning; // Orange for active streak
            barOpacity = 1;
          } else if (isInStreak) {
            barColor = colors.warning; // Orange for past streaks
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
    }, [dailyActivity, streakMap, colors.warning, colors.tint, colors.textTertiary]);

    // Generate balanced week labels
    const weekLabels = useMemo(() => {
      const labels: { text: string; position: number }[] = [];
      const daysAgo = dailyActivity.length - 1;
      const barSpacing = 2;
      const totalBarWidth = barWidth + barSpacing;

      // Add week markers at regular intervals
      for (let i = 7; i <= daysAgo; i += 7) {
        const weeksAgo = Math.floor(i / 7);
        const position = chartWidth - i * totalBarWidth - barWidth / 2;

        // Only show if there's enough space
        if (position >= 30 && position <= chartWidth - 30) {
          labels.push({
            text: `${weeksAgo}w`,
            position,
          });
        }
      }

      return labels;
    }, [dailyActivity.length, chartWidth, barWidth]);

    return (
      <View style={[styles.container, { height }]}>
        {/* Chart area */}
        <View style={styles.chartArea}>
          <View style={[styles.barsContainer, { width: chartWidth }]}>
            {bars.map(bar => (
              <View
                key={bar.key}
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height: BAR_HEIGHT,
                    backgroundColor: bar.barColor,
                    opacity: bar.barOpacity,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Week labels */}
        <View style={[styles.labelsContainer, { width: chartWidth }]}>
          {weekLabels.map(label => (
            <ThemedText
              key={`week-${label.text}-${label.position}`}
              type="caption"
              colorName="textTertiary"
              style={[
                styles.label,
                {
                  left: label.position,
                  transform: [{ translateX: -12 }], // Center the text
                },
              ]}
            >
              {label.text}
            </ThemedText>
          ))}
        </View>
      </View>
    );
  }
);

StreakChart.displayName = 'StreakChart';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SPACING.LARGE, // Match StreakMetrics padding
    paddingVertical: LAYOUT.SPACING.MEDIUM,
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
  labelsContainer: {
    position: 'relative',
    height: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  label: {
    position: 'absolute',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    textAlign: 'center',
    width: 24,
  },
});
