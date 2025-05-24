import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Rect, Shadow } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_14 } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { generateDateRange, isSameDay } from '../shared/utils';
import { useChartColors } from '../shared/chartColors';

interface ActivityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const ActivityChart = memo(({ studyWords = [], onInfoPress }: ActivityChartProps) => {
  const colors = useColors();
  const chartColors = useChartColors();

  // Add top padding to prevent bars from being cut off
  const TOP_PADDING = 8; // Space for bar tops and shadows

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
      return 'Ready to start your learning journey';
    }
    if (dailyAverage >= 5) {
      return 'Excellent consistency';
    }
    if (dailyAverage >= 3) {
      return 'Great momentum this week';
    }
    if (weeklyTotal >= 5) {
      return 'Good progress this week';
    }
    return 'Keep building your streak';
  }, [chartData.insights]);

  // Helper function to get activity level and color using consistent color system
  const getActivityLevel = (activity: number, maxActivity: number) => {
    if (activity === 0) return { level: 'none', color: chartColors.activity.none };

    const ratio = activity / maxActivity;
    if (ratio >= 0.8) return { level: 'high', color: chartColors.activity.high };
    if (ratio >= 0.5) return { level: 'medium', color: chartColors.activity.medium };
    if (ratio >= 0.2) return { level: 'low', color: chartColors.activity.low };
    return { level: 'minimal', color: chartColors.activity.none };
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
            <View style={[styles.emptyChart, { backgroundColor: chartColors.ui.background }]}>
              <View style={styles.emptyBars}>
                {Array.from({ length: 14 }).map((_, index) => (
                  <View
                    key={index}
                    style={[styles.emptyBar, { backgroundColor: chartColors.activity.none }]}
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
            label: 'daily average',
          }}
          rightStat={{
            value: chartData.insights.weeklyTotal,
            label: 'weekly total',
            color: chartColors.activity.high,
          }}
        />

        {/* Enhanced Activity Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Subtle horizontal grid lines */}
            <Group>
              {[0.25, 0.5, 0.75].map((ratio, index) => (
                <Rect
                  key={`grid-line-${index}`}
                  x={0}
                  y={TOP_PADDING + (GRAPH_HEIGHT_LARGE - TOP_PADDING) * ratio - 0.5}
                  width={GRAPH_WIDTH}
                  height={1}
                  color={chartColors.ui.grid}
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
                      (data.totalActivity / chartData.maxActivity) *
                        (GRAPH_HEIGHT_LARGE - TOP_PADDING - 8)
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
                      y={GRAPH_HEIGHT_LARGE - barHeight - TOP_PADDING / 2}
                      width={barWidth}
                      height={barHeight}
                      color={barColor}
                    >
                      <Shadow
                        dx={0}
                        dy={1}
                        blur={3}
                        color={chartColors.withOpacity(barColor, 0.3)}
                      />
                    </Rect>

                    {/* Subtle highlight on top of bar */}
                    {data.totalActivity > 0 && (
                      <Rect
                        x={x}
                        y={GRAPH_HEIGHT_LARGE - barHeight - TOP_PADDING / 2}
                        width={barWidth}
                        height={Math.min(barHeight / 3, 4)}
                        color={chartColors.withOpacity(colors.white, 0.2)}
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
            { type: 'bar', color: chartColors.activity.high, label: 'High' },
            { type: 'bar', color: chartColors.activity.medium, label: 'Medium' },
            { type: 'bar', color: chartColors.activity.low, label: 'Low' },
            { type: 'bar', color: chartColors.activity.none, label: 'None' },
          ]}
          timeRange="Last 14 days"
        />
      </View>
    </BaseCard>
  );
});

ActivityChart.displayName = 'ActivityChart';

const styles = StyleSheet.create({
  progressCard: {},
  progressContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
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
