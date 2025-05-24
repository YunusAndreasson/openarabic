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
import { generateDateRange } from '../shared/utils';
import { useChartColors } from '../shared/chartColors';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const MasteryChart = memo(({ studyWords = [], onInfoPress }: MasteryChartProps) => {
  const colors = useColors();
  const chartColors = useChartColors();

  // Add top padding to prevent dots from being cut off
  const TOP_PADDING = 8; // Space for circle radius + shadow

  // Calculate mastery progression over the last 14 days
  const masteryData = useMemo(() => {
    const dates = generateDateRange(DAYS_14);

    return dates.map(date => {
      let masteredCount = 0;
      let totalCount = 0;

      studyWords.forEach(word => {
        const createdAt = new Date(word.created_at);

        // Only count words that existed by this date
        if (createdAt <= date) {
          totalCount++;

          // Check if word was mastered by this date using consistent FSRS logic
          const state = word.fsrs_state;
          const stability = word.fsrs_stability ?? 0;
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          // Word is mastered if: Review state (2) with stability >= 5 days AND reviewed by this date
          if (state === 2 && stability >= 5 && lastReview && lastReview <= date) {
            masteredCount++;
          }
        }
      });

      const masteryRate = totalCount > 0 ? (masteredCount / totalCount) * 100 : 0;
      return { date, masteredCount, totalCount, masteryRate };
    });
  }, [studyWords]);

  // Calculate chart data and insights
  const chartData = useMemo(() => {
    if (masteryData.length === 0) {
      return {
        masteryPath: '',
        smoothPath: '',
        hasData: false,
        insights: { currentRate: 0, trend: 'stable' as const, totalMastered: 0 },
        milestones: [],
        dataPoints: [],
      };
    }

    // Check if we have any data points with actual words
    const hasData = masteryData.some(d => d.totalCount > 0);

    if (!hasData) {
      return {
        masteryPath: '',
        smoothPath: '',
        hasData: false,
        insights: { currentRate: 0, trend: 'stable' as const, totalMastered: 0 },
        milestones: [],
        dataPoints: [],
      };
    }

    const maxRate = Math.max(1, Math.max(...masteryData.map(d => d.masteryRate)));
    const stepX = GRAPH_WIDTH / Math.max(1, masteryData.length - 1); // Prevent division by zero

    // Add top padding to prevent dots from being cut off
    const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING;

    // Create smooth curve using Skia Path with better interpolation
    const path = Skia.Path.Make();
    const points: { x: number; y: number; rate: number; date: Date }[] = [];

    masteryData.forEach((data, index) => {
      const x = index * stepX;
      const y = TOP_PADDING + (chartHeight - (data.masteryRate / maxRate) * chartHeight);
      points.push({ x, y, rate: data.masteryRate, date: data.date });

      if (index === 0) {
        path.moveTo(x, y);
      } else if (masteryData.length > 1) {
        // Only create curves if we have more than one point
        const prevPoint = points[index - 1];
        const controlX1 = prevPoint!.x + (x - prevPoint!.x) * 0.3;
        const controlY1 = prevPoint!.y;
        const controlX2 = prevPoint!.x + (x - prevPoint!.x) * 0.7;
        const controlY2 = y;
        path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
      }
    });

    // Find significant milestones with better thresholds
    const milestones = [25, 50, 75, 90]
      .map(target => {
        const milestone = masteryData.find(d => d.masteryRate >= target);
        if (milestone) {
          const index = masteryData.indexOf(milestone);
          const x = index * stepX;
          const y = TOP_PADDING + (chartHeight - (milestone.masteryRate / maxRate) * chartHeight);
          return { x, y, rate: target, achieved: true, date: milestone.date };
        }
        return { x: 0, y: 0, rate: target, achieved: false, date: new Date() };
      })
      .filter(m => m.achieved);

    // Calculate insights with better trend analysis
    const recent = masteryData.slice(-7);
    const older = masteryData.slice(-14, -7);

    const currentRate = recent[recent.length - 1]?.masteryRate || 0;
    const recentAvg =
      recent.length > 0 ? recent.reduce((sum, day) => sum + day.masteryRate, 0) / recent.length : 0;
    const olderAvg =
      older.length > 0 ? older.reduce((sum, day) => sum + day.masteryRate, 0) / older.length : 0;

    const change = recentAvg - olderAvg;
    const trend = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';
    const totalMastered = recent[recent.length - 1]?.masteredCount || 0;

    return {
      masteryPath: path.toSVGString(),
      smoothPath: path.toSVGString(),
      hasData: true, // We know we have data at this point
      maxRate,
      milestones,
      dataPoints: points,
      insights: {
        currentRate: Math.round(currentRate * 10) / 10,
        trend,
        totalMastered,
        weeklyChange: Math.round(change * 10) / 10,
      },
    };
  }, [masteryData]);

  // Generate subtitle based on mastery trend with more context
  const subtitle = useMemo(() => {
    const { currentRate, trend, weeklyChange } = chartData.insights;

    if (currentRate === 0) {
      return 'Start reviewing to build mastery';
    }
    if (trend === 'improving') {
      return `Improving by ${Math.abs(weeklyChange)}% this week`;
    }
    if (trend === 'declining') {
      return `Down ${Math.abs(weeklyChange)}% - focus on reviews`;
    }
    if (currentRate >= 80) {
      return 'Outstanding mastery rate';
    }
    if (currentRate >= 70) {
      return 'Excellent mastery rate';
    }
    if (currentRate >= 50) {
      return 'Good mastery progress';
    }
    return 'Building vocabulary foundation';
  }, [chartData.insights]);

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.masteryCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.masteryContent}>
          <CardHeader
            title="Mastery Progress"
            subtitle="Track your vocabulary mastery journey"
            onInfoPress={onInfoPress}
          />

          {/* Empty state with visual guidance */}
          <View style={styles.emptyStateContainer}>
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
    <BaseCard style={styles.masteryCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.masteryContent}>
        <CardHeader title="Mastery Progress" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: `${chartData.insights.currentRate}%`,
            label: 'mastery rate',
            color: chartColors.trend[chartData.insights.trend as keyof typeof chartColors.trend],
          }}
          rightStat={{
            value: chartData.insights.totalMastered,
            label: 'words mastered',
          }}
        />

        {/* Enhanced Mastery Graph with advanced Skia features */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Vertical grid lines for 14-day indication */}
            <Group>
              {/* Vertical grid lines for each day */}
              {masteryData.map((_, index) => {
                const x = (index / Math.max(1, masteryData.length - 1)) * GRAPH_WIDTH;
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

            {/* Performance zone highlighting */}
            <Group>
              {chartData.maxRate && chartData.maxRate >= 70 && (
                <Group>
                  {(() => {
                    const targetY =
                      TOP_PADDING +
                      (GRAPH_HEIGHT_LARGE - TOP_PADDING) -
                      (70 / chartData.maxRate) * (GRAPH_HEIGHT_LARGE - TOP_PADDING);

                    return (
                      <>
                        <Rect
                          x={0}
                          y={TOP_PADDING}
                          width={GRAPH_WIDTH}
                          height={targetY - TOP_PADDING}
                          color={chartColors.withOpacity(chartColors.performance.excellent, 0.05)}
                        />
                        <Rect
                          x={0}
                          y={targetY - 0.5}
                          width={GRAPH_WIDTH}
                          height={1}
                          color={chartColors.withOpacity(chartColors.performance.excellent, 0.4)}
                        />
                      </>
                    );
                  })()}
                </Group>
              )}
            </Group>

            {/* Area fill under the mastery line */}
            <Group>
              {chartData.smoothPath && chartData.dataPoints.length > 0 && (
                <Path
                  path={`${chartData.smoothPath} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE} L 0 ${GRAPH_HEIGHT_LARGE} Z`}
                  color={chartColors.withOpacity(chartColors.ui.dataLine, 0.4)}
                />
              )}

              {(!chartData.smoothPath || chartData.smoothPath.length === 0) &&
                chartData.dataPoints.length > 1 && (
                  <Group>
                    {(() => {
                      const firstPoint = chartData.dataPoints[0];
                      const lastPoint = chartData.dataPoints[chartData.dataPoints.length - 1];

                      if (!firstPoint || !lastPoint) return null;

                      let areaPath = `M ${firstPoint.x} ${GRAPH_HEIGHT_LARGE}`;
                      chartData.dataPoints.forEach(point => {
                        areaPath += ` L ${point.x} ${point.y}`;
                      });
                      areaPath += ` L ${lastPoint.x} ${GRAPH_HEIGHT_LARGE} Z`;

                      return (
                        <Path
                          path={areaPath}
                          color={chartColors.withOpacity(chartColors.ui.dataLine, 0.4)}
                        />
                      );
                    })()}
                  </Group>
                )}
            </Group>

            {/* Main mastery line */}
            <Group>
              {chartData.smoothPath && chartData.dataPoints.length > 0 && (
                <Group>
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

                  {/* Data points with enhanced styling */}
                  {chartData.dataPoints.map((point, index) => (
                    <Group key={`mastery-point-${index}`}>
                      <Circle cx={point.x} cy={point.y} r={4} color={chartColors.ui.dataLine}>
                        <Shadow
                          dx={0}
                          dy={1}
                          blur={2}
                          color={chartColors.withOpacity(chartColors.ui.dataLine, 0.4)}
                        />
                      </Circle>
                    </Group>
                  ))}
                </Group>
              )}
            </Group>

            {/* Milestone indicators */}
            <Group>
              {chartData.milestones.map((milestone, index) => (
                <Group key={`milestone-${index}`}>
                  <Circle cx={milestone.x} cy={milestone.y} r={6} color={chartColors.ui.dataLine}>
                    <Shadow
                      dx={0}
                      dy={2}
                      blur={3}
                      color={chartColors.withOpacity(chartColors.ui.dataLine, 0.4)}
                    />
                  </Circle>
                </Group>
              ))}
            </Group>
          </Canvas>
        </View>

        <ChartFooter
          legendItems={[
            { type: 'line', color: chartColors.ui.dataLine, label: 'Progress' },
            { type: 'dot', color: chartColors.ui.dataLine, label: 'Milestones' },
          ]}
          timeRange="Last 14 days"
        />
      </View>
    </BaseCard>
  );
});

MasteryChart.displayName = 'MasteryChart';

const styles = StyleSheet.create({
  masteryCard: {},
  masteryContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  emptyStateContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
});
