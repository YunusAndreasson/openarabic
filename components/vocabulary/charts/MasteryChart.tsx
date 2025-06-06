import {
  Path,
  Circle,
  Group,
  Skia,
  Rect,
  LinearGradient,
  vec,
  Mask,
} from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';

import { ThemedText } from '../../ThemedText';
import {
  BaseChart,
  ChartCanvas,
  ChartGrid,
  ChartAxes,
  Y_AXIS_WIDTH,
  type DataPoint,
} from '../shared';
import { useChartColors } from '../shared/chartColors';
import {
  generateChartSubtitle,
  createStandardizedStats,
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
} from '../shared/chartMessages';
import {
  GRAPH_WIDTH,
  GRAPH_HEIGHT_LARGE,
  DAYS_7,
  MASTERY_STABILITY_THRESHOLD,
  CHART_VISUAL,
} from '../shared/constants';
import {
  generateDateRange,
  createStandardizedPerformanceZones,
  generatePerformanceSubtitle,
  createAreaFillPath,
} from '../shared/utils';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  onStatPress?: (category: StatCategory) => void;
  hideTitle?: boolean;
}

export const MasteryChart = memo(
  ({ studyWords = [], onInfoPress, onStatPress, hideTitle = false }: MasteryChartProps) => {
    const chartColors = useChartColors();
    const colors = useColors();

    // Add top padding to prevent dots from being cut off
    const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING; // Optimized space for data points

    // Calculate mastery progression over the last 7 days
    const masteryData = useMemo(() => {
      const dates = generateDateRange(DAYS_7);

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
      const recent = masteryData.slice(-4); // Last 4 days for 7-day period
      const older = masteryData.slice(-7, -4); // Previous 3 days for comparison

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
        hasData: true, // We know we have data at this point
        performanceZones,
        milestones,
        dataPoints: points,
        insights: {
          currentRate: Math.round(currentRate),
          trend,
          totalMastered,
          weeklyChange: Math.round(change),
        },
      };
    }, [masteryData]);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentRate, trend, weeklyChange } = chartData.insights;

      if (currentRate === 0) {
        return 'Start reviewing to build memory strength';
      }

      // Use standardized subtitle generator with safe defaults
      return generateChartSubtitle.mastery(
        currentRate,
        trend as 'improving' | 'declining' | 'stable',
        weeklyChange ?? 0
      );
    }, [chartData.insights]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint[] = useMemo(() => {
      return chartData.dataPoints
        .map((point, index) => {
          const data = masteryData[index];
          if (!data) return null;

          return {
            x: point.x,
            y: point.y,
            value: `${Math.round(point.rate)}%`,
            label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            data: data,
          } as DataPoint;
        })
        .filter((point): point is DataPoint => point !== null);
    }, [chartData.dataPoints, masteryData]);

    // Create standardized stats using new messaging system
    const { leftStat, rightStat } = useMemo(() => {
      if (!chartData.hasData) {
        return createStandardizedStats.mastery(
          0,
          0,
          chartColors.performance.poor,
          chartColors.performance.excellent,
          onStatPress
        );
      }

      return createStandardizedStats.mastery(
        chartData.insights.currentRate,
        chartData.insights.totalMastered,
        chartColors.getPerformanceColor(chartData.insights.currentRate),
        chartColors.performance.excellent,
        onStatPress
      );
    }, [chartData, chartColors, onStatPress]);

    return (
      <BaseChart
        title={CHART_LABELS.STRENGTH}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        leftStat={leftStat}
        rightStat={rightStat}
        contentHeight={GRAPH_HEIGHT_LARGE + 32} // Optimized space for axis labels aligned with card padding
        emptyStateText={EMPTY_STATE_MESSAGES.mastery}
      >
        <View style={{ position: 'relative' }}>
          <View style={{ marginLeft: Y_AXIS_WIDTH }}>
            <ChartCanvas
              dataPoints={dataPoints}
              enableTooltips={true}
              accessibilityLabel="Mastery progression chart showing learning progress over the past 7 days"
            >
              {/* Subtle grid lines for better visual structure */}
              <ChartGrid
                width={GRAPH_WIDTH}
                height={GRAPH_HEIGHT_LARGE}
                gridLines={4}
                topPadding={TOP_PADDING}
              />

              {/* Area fill under the mastery line with gradient - rendered first as base */}
              <Group>
                {chartData.masteryPath && chartData.dataPoints.length > 0 && (
                  <Path
                    path={createAreaFillPath(
                      chartData.masteryPath,
                      GRAPH_WIDTH,
                      GRAPH_HEIGHT_LARGE
                    )}
                  >
                    <LinearGradient
                      start={vec(0, TOP_PADDING)}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      colors={chartColors.getAreaFillGradient('mastery')}
                      positions={[0, 0.25, 0.65, 1]}
                    />
                  </Path>
                )}
              </Group>

              {/* Standardized performance zones background - masked to only show below the data line */}
              <Group>
                {chartData.masteryPath && chartData.dataPoints.length > 0 && (
                  <Mask
                    mask={
                      <Path
                        path={createAreaFillPath(
                          chartData.masteryPath,
                          GRAPH_WIDTH,
                          GRAPH_HEIGHT_LARGE
                        )}
                        color="white"
                      />
                    }
                  >
                    {chartData.performanceZones?.map((zone, index) => (
                      <Rect
                        key={`performance-zone-${index}`}
                        x={0}
                        y={zone.y}
                        width={GRAPH_WIDTH}
                        height={zone.height}
                        color={chartColors.withOpacity(zone.color, 0.25)}
                      />
                    ))}
                  </Mask>
                )}
              </Group>

              {/* Main mastery line with brand accent color */}
              <Group>
                {chartData.masteryPath && chartData.dataPoints.length > 0 && (
                  <Path
                    path={chartData.masteryPath}
                    style="stroke"
                    strokeWidth={CHART_VISUAL.LINE_WIDTH}
                    strokeCap="round"
                    strokeJoin="round"
                    color={chartColors.ui.accent}
                  />
                )}

                {/* Data points with enhanced styling */}
                {chartData.dataPoints.map((point, index) => (
                  <Group key={`mastery-point-${index}`}>
                    {/* Enhanced data point with border */}
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={CHART_VISUAL.DATA_POINT_SIZE}
                      color={chartColors.ui.accent}
                    />
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={CHART_VISUAL.DATA_POINT_INNER_SIZE}
                      color={chartColors.ui.background}
                    />
                  </Group>
                ))}
              </Group>

              {/* Subtle milestone indicators */}
              <Group>
                {chartData.milestones.map((milestone, index) => (
                  <Group key={`milestone-${index}`}>
                    {/* Subtle milestone indicator - much smaller */}
                    <Circle
                      cx={milestone.x}
                      cy={milestone.y}
                      r={CHART_VISUAL.MILESTONE_SIZE}
                      color={chartColors.withOpacity(chartColors.performance.excellent, 0.15)}
                    />
                    <Circle
                      cx={milestone.x}
                      cy={milestone.y}
                      r={CHART_VISUAL.MILESTONE_INNER_SIZE}
                      color={chartColors.withOpacity(chartColors.performance.excellent, 0.8)}
                    />
                  </Group>
                ))}
              </Group>
            </ChartCanvas>
          </View>

          {/* Enhanced axis labels with proper padding and y-axis values */}
          <ChartAxes
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT_LARGE}
            xLabels={masteryData.map((data, index) =>
              index === masteryData.length - 1
                ? 'Today'
                : data.date.toLocaleDateString('en-US', { weekday: 'short' })
            )}
            xLabelPositions={chartData.dataPoints.map(point => point.x)}
            yMax={100}
            showYAxis={true}
            topPadding={TOP_PADDING}
          />
        </View>
      </BaseChart>
    );
  }
);

MasteryChart.displayName = 'MasteryChart';

// Styles removed - now using ChartAxes component
