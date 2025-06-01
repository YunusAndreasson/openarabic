import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Group,
  Shadow,
  Skia,
  Rect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';

import type { StudyWord, StatCategory } from '@/types/vocabulary.types';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { ChartTooltip, DataPointOverlay, useChartTooltip } from '../shared/ChartInteractivity';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_14, CHART_LAYOUT } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import {
  generateDateRange,
  createStandardizedPerformanceZones,
  generatePerformanceSubtitle,
  createAreaFillPath,
} from '../shared/utils';
import { useChartColors } from '../shared/chartColors';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  onStatPress?: (category: StatCategory) => void;
  hideTitle?: boolean;
}

export const MasteryChart = memo(
  ({ studyWords = [], onInfoPress, onStatPress, hideTitle = false }: MasteryChartProps) => {
    const chartColors = useChartColors();
    const { tooltip, showTooltip } = useChartTooltip();

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

      const maxRate = Math.max(100, Math.max(...masteryData.map(d => d.masteryRate))); // Always use 100% as ceiling
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
        recent.length > 0
          ? recent.reduce((sum, day) => sum + day.masteryRate, 0) / recent.length
          : 0;
      const olderAvg =
        older.length > 0 ? older.reduce((sum, day) => sum + day.masteryRate, 0) / older.length : 0;

      const change = recentAvg - olderAvg;
      const trend = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';
      const totalMastered = recent[recent.length - 1]?.masteredCount || 0;

      // Define standardized performance zones using shared utility
      const performanceZones = createStandardizedPerformanceZones(
        chartHeight,
        TOP_PADDING,
        chartColors
      );

      return {
        masteryPath: path.toSVGString(),
        smoothPath: path.toSVGString(),
        hasData: true, // We know we have data at this point
        maxRate,
        performanceZones,
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

    // Generate subtitle using shared utility with custom logic for trends
    const subtitle = useMemo(() => {
      const { currentRate, trend, weeklyChange } = chartData.insights;

      if (currentRate === 0) {
        return 'Start reviewing to build mastery';
      }

      return generatePerformanceSubtitle(
        currentRate,
        'mastery rate',
        trend as 'improving' | 'declining' | 'stable',
        weeklyChange
      );
    }, [chartData.insights]);

    if (!chartData.hasData) {
      return (
        <BaseCard shadowSize="small" includePressAnimation={false}>
          <View style={styles.masteryContent}>
            {!hideTitle && (
              <CardHeader
                title="Mastery"
                subtitle="Study some words to see your progress"
                onInfoPress={onInfoPress}
              />
            )}
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard shadowSize="small" includePressAnimation={false}>
        <View style={styles.masteryContent}>
          {!hideTitle && (
            <CardHeader title="Mastery" subtitle={subtitle} onInfoPress={onInfoPress} />
          )}

          <StatsRow
            leftStat={{
              value: `${chartData.insights.currentRate}%`,
              label: 'strength',
              color: chartColors.getPerformanceColor(chartData.insights.currentRate),
            }}
            rightStat={{
              value: chartData.insights.totalMastered,
              label: 'mastered',
              onPress: onStatPress ? () => onStatPress('mastered') : undefined,
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

              {/* Standardized performance zones background */}
              <Group>
                {chartData.performanceZones?.map((zone, index) => (
                  <Rect
                    key={`performance-zone-${index}`}
                    x={0}
                    y={zone.y}
                    width={GRAPH_WIDTH}
                    height={zone.height}
                    color={chartColors.withOpacity(zone.color, 0.12)}
                  />
                ))}
              </Group>

              {/* Area fill under the mastery line with gradient */}
              <Group>
                {chartData.smoothPath && chartData.dataPoints.length > 0 && (
                  <Path
                    path={createAreaFillPath(chartData.smoothPath, GRAPH_WIDTH, GRAPH_HEIGHT_LARGE)}
                  >
                    <LinearGradient
                      start={vec(0, TOP_PADDING)}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      colors={chartColors.getAreaFillGradient('mastery')}
                      positions={[0, 0.25, 0.65, 1]}
                    />
                  </Path>
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
                          <Path path={areaPath}>
                            <LinearGradient
                              start={vec(0, TOP_PADDING)}
                              end={vec(0, GRAPH_HEIGHT_LARGE)}
                              colors={chartColors.getAreaFillGradient('mastery')}
                              positions={[0, 0.25, 0.65, 1]}
                            />
                          </Path>
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
                      strokeCap="round"
                      strokeJoin="round"
                      color={chartColors.ui.dataLine}
                    >
                      <Shadow
                        dx={0}
                        dy={2}
                        blur={6}
                        color={chartColors.getDataPointGlow('mastery')}
                      />
                    </Path>

                    {/* Data points with enhanced styling */}
                    {chartData.dataPoints.map((point, index) => (
                      <Group key={`mastery-point-${index}`}>
                        {/* Subtle glow ring */}
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={6}
                          color={chartColors.getDataPointGlow('mastery')}
                        />
                        {/* Main data point */}
                        <Circle cx={point.x} cy={point.y} r={4} color={chartColors.ui.dataLine}>
                          <Shadow
                            dx={0}
                            dy={1}
                            blur={3}
                            color={chartColors.getDataPointGlow('mastery')}
                          />
                        </Circle>
                      </Group>
                    ))}
                  </Group>
                )}
              </Group>

              {/* Enhanced milestone indicators */}
              <Group>
                {chartData.milestones.map((milestone, index) => (
                  <Group key={`milestone-${index}`}>
                    {/* Milestone glow */}
                    <Circle
                      cx={milestone.x}
                      cy={milestone.y}
                      r={9}
                      color={chartColors.withOpacity(chartColors.performance.excellent, 0.2)}
                    />
                    {/* Milestone ring */}
                    <Circle
                      cx={milestone.x}
                      cy={milestone.y}
                      r={7}
                      color={chartColors.withOpacity(chartColors.performance.excellent, 0.4)}
                    />
                    {/* Milestone center */}
                    <Circle
                      cx={milestone.x}
                      cy={milestone.y}
                      r={5}
                      color={chartColors.performance.excellent}
                    >
                      <Shadow
                        dx={0}
                        dy={2}
                        blur={4}
                        color={chartColors.withOpacity(chartColors.performance.excellent, 0.5)}
                      />
                    </Circle>
                  </Group>
                ))}
              </Group>
            </Canvas>

            {/* Interactive data point overlays using reusable component */}
            {chartData.dataPoints.map((point, index) => {
              const data = masteryData[index];
              if (!data) return null;

              return (
                <DataPointOverlay
                  key={`data-point-${index}`}
                  x={point.x}
                  y={point.y}
                  value={`${Math.round(point.rate * 10) / 10}%`}
                  label={data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  onPress={showTooltip}
                  accessibilityLabel={`Data point: ${Math.round(point.rate * 10) / 10}% mastery on ${data.date.toLocaleDateString()}`}
                />
              );
            })}

            {/* Reusable tooltip component */}
            <ChartTooltip tooltip={tooltip} maxWidth={GRAPH_WIDTH} />
          </View>

          <ChartFooter
            legendItems={[{ type: 'line', color: chartColors.ui.dataLine, label: 'Mastery' }]}
            timeRange="Past 14 days"
          />
        </View>
      </BaseCard>
    );
  }
);

MasteryChart.displayName = 'MasteryChart';

const styles = StyleSheet.create({
  masteryContent: {
    padding: CHART_LAYOUT.CONTENT_PADDING,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING,
    marginHorizontal: CHART_LAYOUT.GRAPH_MARGIN_HORIZONTAL,
    paddingVertical: CHART_LAYOUT.GRAPH_MARGIN_VERTICAL,
  },
});
