import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Group,
  Rect,
  Shadow,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_14 } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { generateDateRange, isSameDay } from '../shared/utils';

interface ActivityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const ActivityChart = memo(({ studyWords = [], onInfoPress }: ActivityChartProps) => {
  const colors = useColors();

  // Define activity level colors with better contrast and visual hierarchy
  const activityColors = useMemo(
    () => ({
      high: '#10B981', // Emerald green - high activity
      moderate: '#3B82F6', // Blue - moderate activity
      low: '#F59E0B', // Amber - low activity
      minimal: withOpacity(colors.textTertiary, 0.3), // Very light for minimal activity
      background: withOpacity(colors.textTertiary, 0.05), // Subtle background
      grid: withOpacity(colors.textTertiary, 0.08), // Subtle grid lines
    }),
    [colors]
  );

  // Calculate progress data over the last 14 days
  const progressData = useMemo(() => {
    const dates = generateDateRange(DAYS_14);

    return dates.map(date => {
      let newWords = 0;
      let reviewsToday = 0;

      studyWords.forEach(word => {
        const createdAt = new Date(word.created_at);
        const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

        // Count words added on this specific day
        if (isSameDay(createdAt, date)) {
          newWords++;
        }

        // Count reviews done on this specific day
        if (lastReview && isSameDay(lastReview, date) && (word.fsrs_reps ?? 0) > 0) {
          reviewsToday++;
        }
      });

      return { date, newWords, reviewsToday, totalActivity: newWords + reviewsToday };
    });
  }, [studyWords]);

  // Calculate chart paths and insights
  const chartData = useMemo(() => {
    if (progressData.length === 0) {
      return { hasData: false, insights: { dailyAverage: 0, weeklyTotal: 0 } };
    }

    const hasData = progressData.some(d => d.totalActivity > 0);

    if (!hasData) {
      return { hasData: false, insights: { dailyAverage: 0, weeklyTotal: 0 } };
    }

    const maxActivity = Math.max(1, Math.max(...progressData.map(d => d.totalActivity)));

    // Calculate insights
    const recentDays = progressData.slice(-7);
    const totalNewWords = recentDays.reduce((sum, day) => sum + day.newWords, 0);
    const totalReviews = recentDays.reduce((sum, day) => sum + day.reviewsToday, 0);
    const dailyAverage = Math.round(((totalNewWords + totalReviews) / 7) * 10) / 10;

    return {
      hasData,
      maxActivity,
      insights: {
        dailyAverage,
        weeklyTotal: totalNewWords + totalReviews,
      },
    };
  }, [progressData]);

  // Generate subtitle based on activity with more encouraging language
  const subtitle = useMemo(() => {
    const { weeklyTotal, dailyAverage } = chartData.insights;

    if (weeklyTotal === 0) {
      return 'Ready to start your learning journey?';
    }
    if (dailyAverage >= 5) {
      return 'Excellent consistency! 🔥';
    }
    if (dailyAverage >= 3) {
      return 'Great momentum this week! 📈';
    }
    if (weeklyTotal >= 5) {
      return 'Good progress this week 👍';
    }
    return 'Keep building your streak 💪';
  }, [chartData.insights]);

  // Helper function to get activity level and color
  const getActivityLevel = (activity: number, maxActivity: number) => {
    if (activity === 0) return { level: 'none', color: activityColors.minimal };

    const ratio = activity / maxActivity;
    if (ratio >= 0.7) return { level: 'high', color: activityColors.high };
    if (ratio >= 0.4) return { level: 'moderate', color: activityColors.moderate };
    if (ratio >= 0.1) return { level: 'low', color: activityColors.low };
    return { level: 'minimal', color: activityColors.minimal };
  };

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.progressContent}>
          <CardHeader
            title="Activity"
            subtitle="Daily learning patterns over 14 days"
            onInfoPress={onInfoPress}
          />
          <View style={styles.emptyState}>
            <View style={[styles.emptyChart, { backgroundColor: activityColors.background }]}>
              <View style={styles.emptyBars}>
                {Array.from({ length: 14 }).map((_, index) => (
                  <View
                    key={index}
                    style={[styles.emptyBar, { backgroundColor: activityColors.minimal }]}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }

  return (
    <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.progressContent}>
        <CardHeader title="Activity" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: chartData.insights.dailyAverage,
            label: 'daily avg',
          }}
          rightStat={{
            value: chartData.insights.weeklyTotal,
            label: 'this week',
            color: activityColors.high,
          }}
        />

        {/* Enhanced Activity Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Background with subtle gradient */}
            <Group>
              <Rect
                x={0}
                y={0}
                width={GRAPH_WIDTH}
                height={GRAPH_HEIGHT_LARGE}
                color={activityColors.background}
              />
            </Group>

            {/* Subtle horizontal grid lines */}
            <Group>
              {[0.25, 0.5, 0.75].map((ratio, index) => (
                <Rect
                  key={`grid-line-${index}`}
                  x={0}
                  y={GRAPH_HEIGHT_LARGE * ratio - 0.5}
                  width={GRAPH_WIDTH}
                  height={1}
                  color={activityColors.grid}
                />
              ))}
            </Group>

            {/* Activity bars with improved styling */}
            <Group>
              {progressData.map((data, index) => {
                const barWidth = Math.max(8, (GRAPH_WIDTH / progressData.length) * 0.7);
                const x =
                  index * (GRAPH_WIDTH / progressData.length) +
                  (GRAPH_WIDTH / progressData.length - barWidth) / 2;
                const barHeight = chartData.maxActivity
                  ? Math.max(
                      2,
                      (data.totalActivity / chartData.maxActivity) * (GRAPH_HEIGHT_LARGE - 8)
                    )
                  : 2;

                const { color: barColor } = getActivityLevel(
                  data.totalActivity,
                  chartData.maxActivity || 1
                );

                return (
                  <Group key={`activity-bar-${index}`}>
                    {/* Bar with subtle shadow */}
                    <Rect
                      x={x}
                      y={GRAPH_HEIGHT_LARGE - barHeight}
                      width={barWidth}
                      height={barHeight}
                      color={barColor}
                    >
                      <Shadow dx={0} dy={1} blur={3} color={withOpacity(barColor, 0.3)} />
                    </Rect>

                    {/* Subtle highlight on top of bar */}
                    {data.totalActivity > 0 && (
                      <Rect
                        x={x}
                        y={GRAPH_HEIGHT_LARGE - barHeight}
                        width={barWidth}
                        height={Math.min(barHeight / 3, 4)}
                        color={withOpacity(colors.white, 0.2)}
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          </Canvas>
        </View>

        <ChartFooter
          legendItems={[
            { type: 'bar', color: activityColors.high, label: 'High' },
            { type: 'bar', color: activityColors.moderate, label: 'Moderate' },
            { type: 'bar', color: activityColors.low, label: 'Low' },
          ]}
          timeRange="Last 14 days"
        />
      </View>
    </BaseCard>
  );
});

ActivityChart.displayName = 'ActivityChart';

const styles = StyleSheet.create({
  progressCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  progressContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE + LAYOUT.SPACING.SMALL * 2,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  emptyState: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  emptyChart: {
    height: GRAPH_HEIGHT_LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    padding: LAYOUT.SPACING.SMALL,
    justifyContent: 'flex-end',
  },
  emptyBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
  },
  emptyBar: {
    width: 6,
    height: 8,
    borderRadius: 3,
  },
});
