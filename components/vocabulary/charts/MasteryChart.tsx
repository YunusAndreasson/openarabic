import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Group,
  vec,
  Shadow,
  Skia,
  LinearGradient,
  Rect,
  RoundedRect,
  Blur,
} from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_30 } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { generateDateRange, getWordState } from '../shared/utils';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const MasteryChart = memo(({ studyWords = [], onInfoPress }: MasteryChartProps) => {
  const colors = useColors();

  // Calculate mastery progression over the last 30 days
  const masteryData = useMemo(() => {
    const dates = generateDateRange(DAYS_30);

    return dates.map(date => {
      let masteredCount = 0;
      let totalCount = 0;

      studyWords.forEach(word => {
        const createdAt = new Date(word.created_at);

        // Only count words that existed by this date
        if (createdAt <= date) {
          totalCount++;

          // Check if word was mastered by this date
          const wordState = getWordState(word);
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          if (wordState === 'mastered' && lastReview && lastReview <= date) {
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

    // Add padding to prevent clipping of visual elements
    const CHART_PADDING = 20;
    const CHART_TOP_PADDING = 30; // Extra padding for top elements like value indicators
    const chartWidth = GRAPH_WIDTH - CHART_PADDING * 2;
    const chartHeight = GRAPH_HEIGHT_LARGE - CHART_TOP_PADDING - CHART_PADDING;
    const stepX = chartWidth / Math.max(1, masteryData.length - 1); // Prevent division by zero

    // Create smooth curve using Skia Path with better interpolation
    const path = Skia.Path.Make();
    const points: { x: number; y: number; rate: number; date: Date }[] = [];

    masteryData.forEach((data, index) => {
      const x = CHART_PADDING + index * stepX;
      const y = CHART_TOP_PADDING + (chartHeight - (data.masteryRate / maxRate) * chartHeight);
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
          const x = CHART_PADDING + index * stepX;
          const y =
            CHART_TOP_PADDING + (chartHeight - (milestone.masteryRate / maxRate) * chartHeight);
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
    const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';
    const totalMastered = recent[recent.length - 1]?.masteredCount || 0;

    return {
      masteryPath: path.toSVGString(),
      smoothPath: path.toSVGString(),
      hasData: true, // We know we have data at this point
      maxRate,
      milestones,
      dataPoints: points,
      chartPadding: CHART_PADDING,
      chartTopPadding: CHART_TOP_PADDING,
      chartWidth,
      chartHeight,
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
      return `Improving by ${Math.abs(weeklyChange)}% this week! 📈`;
    }
    if (trend === 'declining') {
      return `Down ${Math.abs(weeklyChange)}% - focus on reviews 🔄`;
    }
    if (currentRate >= 80) {
      return 'Outstanding mastery rate! 🏆';
    }
    if (currentRate >= 70) {
      return 'Excellent mastery rate! 🎯';
    }
    if (currentRate >= 50) {
      return 'Good mastery progress 👍';
    }
    return 'Building vocabulary foundation 🌱';
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
              {/* Subtle background pattern */}
              <Group>
                <RoundedRect
                  x={0}
                  y={0}
                  width={GRAPH_WIDTH}
                  height={GRAPH_HEIGHT_LARGE}
                  r={8}
                  color={withOpacity(colors.border, 0.3)}
                />

                {/* Dotted guide lines */}
                {[0.25, 0.5, 0.75].map((ratio, index) => (
                  <Path
                    key={`empty-grid-${index}`}
                    path={`M 20 ${GRAPH_HEIGHT_LARGE * ratio} L ${GRAPH_WIDTH - 20} ${GRAPH_HEIGHT_LARGE * ratio}`}
                    style="stroke"
                    strokeWidth={1}
                    color={withOpacity(colors.textSecondary || colors.text, 0.2)}
                  />
                ))}

                {/* Placeholder curve */}
                <Path
                  path={`M 20 ${GRAPH_HEIGHT_LARGE - 20} Q ${GRAPH_WIDTH / 2} ${GRAPH_HEIGHT_LARGE / 2} ${GRAPH_WIDTH - 20} 30`}
                  style="stroke"
                  strokeWidth={2}
                  color={withOpacity(colors.success, 0.3)}
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
            color:
              chartData.insights.trend === 'improving'
                ? colors.success
                : chartData.insights.trend === 'declining'
                  ? colors.warning
                  : colors.text,
          }}
          rightStat={{
            value: chartData.insights.totalMastered,
            label: 'mastered words',
          }}
        />

        {/* Enhanced Mastery Graph with advanced Skia features */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            <Group>
              <RoundedRect
                x={chartData.chartPadding || 10}
                y={chartData.chartTopPadding || 10}
                width={chartData.chartWidth || GRAPH_WIDTH - 20}
                height={chartData.chartHeight || GRAPH_HEIGHT_LARGE - 20}
                r={8}
                color={withOpacity(colors.card, 0.5)}
              />
            </Group>

            <Group>
              <Circle
                cx={20}
                cy={20}
                r={3}
                color={chartData.hasData ? colors.success : colors.error}
              />
            </Group>

            <Group>
              {[0.25, 0.5, 0.75].map((ratio, index) => {
                const padding = chartData.chartPadding || 0;
                const topPadding = chartData.chartTopPadding || 0;
                const width = chartData.chartWidth || GRAPH_WIDTH;
                const height = chartData.chartHeight || GRAPH_HEIGHT_LARGE;
                const y = topPadding + height * ratio;

                return (
                  <Path
                    key={`grid-group-${index}`}
                    path={`M ${padding} ${y} L ${padding + width} ${y}`}
                    style="stroke"
                    strokeWidth={ratio === 0.5 ? 1 : 0.5}
                    color={withOpacity(
                      colors.textSecondary || colors.text,
                      ratio === 0.5 ? 0.2 : 0.1
                    )}
                  />
                );
              })}
            </Group>

            <Group>
              {chartData.maxRate && chartData.maxRate >= 70 && (
                <Group>
                  {(() => {
                    const padding = chartData.chartPadding || 0;
                    const topPadding = chartData.chartTopPadding || 0;
                    const width = chartData.chartWidth || GRAPH_WIDTH;
                    const height = chartData.chartHeight || GRAPH_HEIGHT_LARGE;
                    const targetY = topPadding + (height - (70 / chartData.maxRate) * height);

                    return (
                      <>
                        <Rect
                          x={padding}
                          y={topPadding}
                          width={width}
                          height={targetY - topPadding}
                          color={withOpacity(colors.success, 0.08)}
                        />
                        <Path
                          path={`M ${padding} ${targetY} L ${padding + width} ${targetY}`}
                          style="stroke"
                          strokeWidth={1.5}
                          color={withOpacity(colors.success, 0.4)}
                        />
                      </>
                    );
                  })()}
                </Group>
              )}
            </Group>

            <Group>
              {chartData.smoothPath && chartData.dataPoints.length > 0 && (
                <Path
                  path={`${chartData.smoothPath} L ${(chartData.chartPadding || 0) + (chartData.chartWidth || GRAPH_WIDTH)} ${(chartData.chartTopPadding || 0) + (chartData.chartHeight || GRAPH_HEIGHT_LARGE)} L ${chartData.chartPadding || 0} ${(chartData.chartTopPadding || 0) + (chartData.chartHeight || GRAPH_HEIGHT_LARGE)} Z`}
                >
                  <LinearGradient
                    start={vec(0, chartData.chartTopPadding || 0)}
                    end={vec(
                      0,
                      (chartData.chartTopPadding || 0) +
                        (chartData.chartHeight || GRAPH_HEIGHT_LARGE)
                    )}
                    colors={[
                      withOpacity(colors.success, 0.25),
                      withOpacity(colors.success, 0.05),
                      withOpacity(colors.success, 0.02),
                    ]}
                  />
                </Path>
              )}

              {(!chartData.smoothPath || chartData.smoothPath.length === 0) &&
                chartData.dataPoints.length > 1 && (
                  <Group>
                    {(() => {
                      const firstPoint = chartData.dataPoints[0];
                      const lastPoint = chartData.dataPoints[chartData.dataPoints.length - 1];
                      const topPadding = chartData.chartTopPadding || 10;
                      const height = chartData.chartHeight || GRAPH_HEIGHT_LARGE - 20;
                      const bottomY = topPadding + height;

                      if (!firstPoint || !lastPoint) return null;

                      let areaPath = `M ${firstPoint.x} ${bottomY}`;
                      chartData.dataPoints.forEach(point => {
                        areaPath += ` L ${point.x} ${point.y}`;
                      });
                      areaPath += ` L ${lastPoint.x} ${bottomY} Z`;

                      return <Path path={areaPath} color={withOpacity(colors.success, 0.15)} />;
                    })()}
                  </Group>
                )}
            </Group>

            <Group>
              {chartData.smoothPath && chartData.dataPoints.length > 0 && (
                <Group>
                  <Path
                    path={chartData.smoothPath}
                    style="stroke"
                    strokeWidth={6}
                    color={withOpacity(colors.success, 0.3)}
                  >
                    <Blur blur={3} />
                  </Path>

                  <Path
                    path={chartData.smoothPath}
                    style="stroke"
                    strokeWidth={3}
                    color={colors.success}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    <Shadow dx={0} dy={2} blur={4} color={withOpacity(colors.success, 0.3)} />
                  </Path>
                </Group>
              )}

              {(!chartData.smoothPath || chartData.smoothPath.length === 0) &&
                chartData.dataPoints.length > 1 && (
                  <Group>
                    {chartData.dataPoints.slice(0, -1).map((point, index) => {
                      const nextPoint = chartData.dataPoints[index + 1];
                      if (!nextPoint) return null;

                      return (
                        <Path
                          key={`line-segment-${index}`}
                          path={`M ${point.x} ${point.y} L ${nextPoint.x} ${nextPoint.y}`}
                          style="stroke"
                          strokeWidth={3}
                          color={colors.success}
                          strokeCap="round"
                          strokeJoin="round"
                        >
                          <Shadow dx={0} dy={2} blur={4} color={withOpacity(colors.success, 0.3)} />
                        </Path>
                      );
                    })}
                  </Group>
                )}
            </Group>

            <Group>
              {chartData.dataPoints.length > 0 &&
                chartData.dataPoints
                  .filter(
                    (_, index) =>
                      index % Math.max(1, Math.floor(chartData.dataPoints.length / 6)) === 0 ||
                      index === chartData.dataPoints.length - 1
                  )
                  .map((point, index) => (
                    <Group key={`data-point-${index}`}>
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={8}
                        color={withOpacity(colors.success, 0.2)}
                      >
                        <Blur blur={2} />
                      </Circle>

                      <Circle cx={point.x} cy={point.y} r={4} color={colors.success}>
                        <Shadow dx={0} dy={1} blur={2} color={withOpacity(colors.success, 0.4)} />
                      </Circle>

                      <Circle cx={point.x} cy={point.y} r={1.5} color={colors.background} />
                    </Group>
                  ))}
            </Group>

            <Group>
              {chartData.milestones
                .filter(m => [50, 75, 90].includes(m.rate))
                .map((milestone, index) => (
                  <Group key={`milestone-${index}`}>
                    <Circle
                      cx={milestone.x}
                      cy={milestone.y}
                      r={10}
                      color={withOpacity(colors.warning, 0.15)}
                    >
                      <Blur blur={1} />
                    </Circle>
                    <Circle cx={milestone.x} cy={milestone.y} r={5} color={colors.warning}>
                      <Shadow dx={0} dy={2} blur={3} color={withOpacity(colors.warning, 0.4)} />
                    </Circle>
                    <Circle cx={milestone.x} cy={milestone.y} r={1.5} color={colors.background} />
                  </Group>
                ))}
            </Group>

            <Group>
              {chartData.dataPoints.length > 0 &&
                (() => {
                  const lastPoint = chartData.dataPoints[chartData.dataPoints.length - 1];
                  if (!lastPoint) return null;

                  return (
                    <Group>
                      <Circle
                        cx={lastPoint.x}
                        cy={lastPoint.y}
                        r={8}
                        color={withOpacity(colors.info, 0.2)}
                      >
                        <Blur blur={2} />
                      </Circle>

                      <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} color={colors.info}>
                        <Shadow dx={0} dy={2} blur={3} color={withOpacity(colors.info, 0.4)} />
                      </Circle>

                      <RoundedRect
                        x={Math.max(chartData.chartPadding || 0, lastPoint.x - 12)}
                        y={Math.max((chartData.chartTopPadding || 0) - 20, lastPoint.y - 20)}
                        width={24}
                        height={14}
                        r={7}
                        color={colors.info}
                      />
                    </Group>
                  );
                })()}
            </Group>
          </Canvas>
        </View>

        <ChartFooter
          legendItems={[
            { type: 'line', color: colors.success, label: 'Progress' },
            { type: 'dot', color: colors.warning, label: 'Goals' },
            { type: 'dot', color: colors.info, label: 'Today' },
          ]}
          timeRange="Last 30 days"
        />
      </View>
    </BaseCard>
  );
});

MasteryChart.displayName = 'MasteryChart';

const styles = StyleSheet.create({
  masteryCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  masteryContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    overflow: 'visible',
  },
  emptyStateContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
});
