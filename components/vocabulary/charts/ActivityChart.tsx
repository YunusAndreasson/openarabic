import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Circle, Group, Shadow, Skia, Rect } from '@shopify/react-native-skia';

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

  // Add top padding to prevent dots from being cut off
  const TOP_PADDING = 8; // Space for circle radius + shadow

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
      return {
        activityPath: '',
        smoothPath: '',
        hasData: false,
        insights: { dailyAverage: 0, weeklyTotal: 0 },
        dataPoints: [],
      };
    }

    const hasData = progressData.some(d => d.totalActivity > 0);

    if (!hasData) {
      return {
        activityPath: '',
        smoothPath: '',
        hasData: false,
        insights: { dailyAverage: 0, weeklyTotal: 0 },
        dataPoints: [],
      };
    }

    const maxActivity = Math.max(1, Math.max(...progressData.map(d => d.totalActivity)));
    const stepX = GRAPH_WIDTH / Math.max(1, progressData.length - 1); // Prevent division by zero

    // Add top padding to prevent dots from being cut off
    const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING;

    // Create smooth curve using Skia Path with better interpolation
    const path = Skia.Path.Make();
    const points: { x: number; y: number; activity: number; date: Date }[] = [];

    progressData.forEach((data, index) => {
      const x = index * stepX;
      const y = TOP_PADDING + (chartHeight - (data.totalActivity / maxActivity) * chartHeight);
      points.push({ x, y, activity: data.totalActivity, date: data.date });

      if (index === 0) {
        path.moveTo(x, y);
      } else if (progressData.length > 1) {
        // Only create curves if we have more than one point
        const prevPoint = points[index - 1];
        const controlX1 = prevPoint!.x + (x - prevPoint!.x) * 0.3;
        const controlY1 = prevPoint!.y;
        const controlX2 = prevPoint!.x + (x - prevPoint!.x) * 0.7;
        const controlY2 = y;
        path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
      }
    });

    // Calculate insights
    const recentDays = progressData.slice(-7);
    const totalNewWords = recentDays.reduce((sum, day) => sum + day.newWords, 0);
    const totalReviews = recentDays.reduce((sum, day) => sum + day.reviewsToday, 0);
    const dailyAverage = Math.round(((totalNewWords + totalReviews) / 7) * 10) / 10;

    return {
      activityPath: path.toSVGString(),
      smoothPath: path.toSVGString(),
      hasData: true,
      maxActivity,
      dataPoints: points,
      insights: {
        dailyAverage,
        weeklyTotal: totalNewWords + totalReviews,
      },
    };
  }, [progressData]);

  // Generate subtitle based on activity with more encouraging language
  const subtitle = useMemo(() => {
    const { weeklyTotal, dailyAverage } = chartData.insights;
    const peakActivity = Math.max(...progressData.map(d => d.totalActivity));
    const activeDays = progressData.filter(d => d.totalActivity > 0).length;

    if (weeklyTotal === 0) {
      return 'Ready to start your learning journey';
    }
    if (dailyAverage >= 5) {
      return `Excellent consistency • ${activeDays}/14 active days`;
    }
    if (dailyAverage >= 3) {
      return `Great momentum • Peak: ${peakActivity} activities`;
    }
    if (weeklyTotal >= 5) {
      return `Good progress • ${activeDays} active days this period`;
    }
    return `Building habits • ${activeDays}/14 days active`;
  }, [chartData.insights, progressData]);

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
            <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
              {/* Vertical day markers for empty state */}
              <Group>
                {/* Vertical day markers */}
                {Array.from({ length: 14 }, (_, index) => (
                  <Rect
                    key={`empty-day-grid-${index}`}
                    x={(index / 13) * GRAPH_WIDTH - 0.5}
                    y={0}
                    width={1}
                    height={GRAPH_HEIGHT_LARGE}
                    color={chartColors.withOpacity(chartColors.ui.border, 0.12)}
                  />
                ))}

                {/* Placeholder curve */}
                <Path
                  path={`M 20 ${GRAPH_HEIGHT_LARGE - 20} Q ${GRAPH_WIDTH / 2} ${GRAPH_HEIGHT_LARGE / 2} ${GRAPH_WIDTH - 20} 30`}
                  style="stroke"
                  strokeWidth={2}
                  color={chartColors.withOpacity(chartColors.ui.dataLine, 0.3)}
                />
              </Group>
            </Canvas>
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
            label: 'avg per day',
          }}
          rightStat={{
            value: chartData.insights.weeklyTotal,
            label: 'words + reviews',
          }}
        />

        {/* Enhanced Activity Graph with line-based visualization */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Vertical grid lines for 14-day indication */}
            <Group>
              {/* Vertical grid lines for each day */}
              {progressData.map((_, index) => {
                const x = (index / Math.max(1, progressData.length - 1)) * GRAPH_WIDTH;
                return (
                  <Rect
                    key={`day-grid-${index}`}
                    x={x - 0.5}
                    y={TOP_PADDING}
                    width={1}
                    height={GRAPH_HEIGHT_LARGE - TOP_PADDING}
                    color={chartColors.withOpacity(chartColors.ui.border, 0.12)}
                  />
                );
              })}
            </Group>

            {/* Area fill under the activity line */}
            <Group>
              {chartData.dataPoints.length > 0 &&
                (() => {
                  const firstPoint = chartData.dataPoints[0];
                  const lastPoint = chartData.dataPoints[chartData.dataPoints.length - 1];

                  if (!firstPoint || !lastPoint) return null;

                  // Create area path properly
                  let areaPath = `M ${firstPoint.x} ${GRAPH_HEIGHT_LARGE}`;

                  // Go up to first data point
                  areaPath += ` L ${firstPoint.x} ${firstPoint.y}`;

                  // Follow all data points
                  for (let i = 1; i < chartData.dataPoints.length; i++) {
                    const point = chartData.dataPoints[i];
                    if (point) {
                      areaPath += ` L ${point.x} ${point.y}`;
                    }
                  }

                  // Close back to bottom
                  areaPath += ` L ${lastPoint.x} ${GRAPH_HEIGHT_LARGE}`;
                  areaPath += ` Z`;

                  return (
                    <Path
                      path={areaPath}
                      color={chartColors.withOpacity(chartColors.ui.dataLine, 0.4)}
                    />
                  );
                })()}
            </Group>

            {/* Main activity line */}
            <Group>
              {chartData.dataPoints.length > 0 && (
                <Group>
                  {/* Render line only if we have multiple points */}
                  {chartData.dataPoints.length > 1 && chartData.smoothPath && (
                    <Path
                      path={chartData.smoothPath}
                      style="stroke"
                      strokeWidth={3}
                      color={chartColors.ui.dataLine}
                    >
                      <Shadow
                        dx={0}
                        dy={2}
                        blur={4}
                        color={chartColors.withOpacity(chartColors.ui.dataLine, 0.3)}
                      />
                    </Path>
                  )}

                  {/* Data points representing words reviewed */}
                  {chartData.dataPoints.map((point, index) => {
                    const dayData = progressData[index];
                    // Only show dots for days with reviews
                    if (!dayData || dayData.reviewsToday === 0) return null;

                    return (
                      <Group key={`review-point-${index}`}>
                        <Circle cx={point.x} cy={point.y} r={4} color={chartColors.activity.medium}>
                          <Shadow
                            dx={0}
                            dy={1}
                            blur={2}
                            color={chartColors.withOpacity(chartColors.activity.medium, 0.4)}
                          />
                        </Circle>
                      </Group>
                    );
                  })}
                </Group>
              )}
            </Group>
          </Canvas>
        </View>

        <ChartFooter
          legendItems={[
            { type: 'line', color: chartColors.ui.dataLine, label: 'Total Activity' },
            { type: 'dot', color: chartColors.activity.medium, label: 'Words Reviewed' },
            {
              type: 'area',
              color: chartColors.withOpacity(chartColors.ui.dataLine, 0.4),
              label: 'Activity Trend',
            },
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
});
