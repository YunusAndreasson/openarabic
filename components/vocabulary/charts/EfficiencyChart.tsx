import React, { memo, useMemo } from 'react';
import { Path, Circle, Group, Skia, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import {
  generateDateRange,
  isSameDay,
  calculateEfficiencyScore,
  createStandardizedPerformanceZones,
  generatePerformanceSubtitle,
  createAreaFillPath,
} from '../shared/utils';
import { useChartColors } from '../shared/chartColors';
import { BaseChart, ChartCanvas, type DataPoint } from '../shared';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_14 } from '../shared/constants';
import {
  generateChartSubtitle,
  createStandardizedStats,
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
} from '../shared/chartMessages';

interface EfficiencyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  hideTitle?: boolean;
  learningWords?: number;
  onStatPress?: (category: StatCategory) => void;
}

export const EfficiencyChart = memo(
  ({
    studyWords = [],
    onInfoPress,
    hideTitle = false,
    learningWords = 0,
    onStatPress,
  }: EfficiencyChartProps) => {
    const chartColors = useChartColors();

    // Calculate efficiency data over the last 14 days
    const efficiencyData = useMemo(() => {
      const dates = generateDateRange(DAYS_14);

      return dates.map(date => {
        let totalEfficiency = 0;
        let wordCount = 0;

        studyWords.forEach(word => {
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          // Count words reviewed on this specific day
          if (lastReview && isSameDay(lastReview, date) && (word.fsrs_reps ?? 0) > 0) {
            const efficiency = calculateEfficiencyScore(word);
            totalEfficiency += efficiency;
            wordCount++;
          }
        });

        const averageEfficiency = wordCount > 0 ? totalEfficiency / wordCount : 0;
        return { date, averageEfficiency, wordCount };
      });
    }, [studyWords]);

    // Calculate chart data and insights
    const chartData = useMemo(() => {
      if (efficiencyData.length === 0) {
        return {
          efficiencyPath: '',
          hasData: false,
          insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
          performanceZones: [],
          dataPoints: [],
        };
      }

      const hasData = efficiencyData.some(d => d.wordCount > 0);

      if (!hasData) {
        return {
          efficiencyPath: '',
          hasData: false,
          insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
          performanceZones: [],
          dataPoints: [],
        };
      }

      const maxEfficiency = Math.max(
        100,
        Math.max(...efficiencyData.map(d => d.averageEfficiency))
      );
      const stepX = GRAPH_WIDTH / (efficiencyData.length - 1);

      // Create smooth curve using Skia Path
      const path = Skia.Path.Make();
      const points: { x: number; y: number; efficiency: number; date: Date }[] = [];

      efficiencyData.forEach((data, index) => {
        const x = index * stepX;
        const y =
          GRAPH_HEIGHT_LARGE - (data.averageEfficiency / maxEfficiency) * GRAPH_HEIGHT_LARGE;
        points.push({ x, y, efficiency: data.averageEfficiency, date: data.date });

        if (index === 0) {
          path.moveTo(x, y);
        } else {
          // Create smooth curves using quadratic bezier
          const prevPoint = points[index - 1];
          const controlX = (prevPoint!.x + x) / 2;
          path.quadTo(controlX, prevPoint!.y, x, y);
        }
      });

      // Define performance zones using standardized utility
      const performanceZones = createStandardizedPerformanceZones(
        GRAPH_HEIGHT_LARGE,
        0,
        chartColors
      ).map(zone => ({
        ...zone,
        // Adjust for efficiency chart scaling
        y:
          GRAPH_HEIGHT_LARGE -
          ((zone.min + (zone.max - zone.min)) / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: ((zone.max - zone.min) / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      }));

      // Calculate insights
      const recent = efficiencyData.slice(-7).filter(d => d.wordCount > 0);
      const older = efficiencyData.slice(-14, -7).filter(d => d.wordCount > 0);

      const currentEfficiency = recent[recent.length - 1]?.averageEfficiency || 0;
      const recentAvg =
        recent.length > 0
          ? recent.reduce((sum, day) => sum + day.averageEfficiency, 0) / recent.length
          : 0;
      const olderAvg =
        older.length > 0
          ? older.reduce((sum, day) => sum + day.averageEfficiency, 0) / older.length
          : 0;

      const change = recentAvg - olderAvg;
      const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';

      return {
        efficiencyPath: path.toSVGString(),
        hasData,
        performanceZones,
        dataPoints: points,
        insights: {
          currentEfficiency: Math.round(currentEfficiency),
          trend,
          weeklyAverage: Math.round(recentAvg),
        },
      };
    }, [efficiencyData, chartColors]);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentEfficiency, weeklyAverage } = chartData.insights;

      if (currentEfficiency === 0) {
        return 'Practice to track learning speed';
      }

      // Use standardized subtitle generator
      return generateChartSubtitle.efficiency(currentEfficiency, weeklyAverage);
    }, [chartData.insights]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint[] = useMemo(() => {
      return chartData.dataPoints
        .map((point, index) => {
          const data = efficiencyData[index];
          if (!data || data.wordCount === 0) return null;

          return {
            x: point.x,
            y: point.y,
            value: `${Math.round(point.efficiency)}%`,
            label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            data: data,
          } as DataPoint;
        })
        .filter((point): point is DataPoint => point !== null);
    }, [chartData.dataPoints, efficiencyData]);

    // Create standardized stats using new messaging system with semantic matching
    const { leftStat, rightStat } = useMemo(() => {
      if (!chartData.hasData) {
        return createStandardizedStats.efficiency(
          0,
          0,
          chartColors.performance.poor,
          chartColors.performance.poor,
          onStatPress
        );
      }

      return createStandardizedStats.efficiency(
        chartData.insights.currentEfficiency,
        learningWords,
        chartColors.getPerformanceColor(chartData.insights.currentEfficiency),
        chartColors.performance.good,
        onStatPress
      );
    }, [chartData, chartColors, learningWords, onStatPress]);

    return (
      <BaseChart
        title={CHART_LABELS.SPEED}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        leftStat={leftStat}
        rightStat={rightStat}
        contentHeight={GRAPH_HEIGHT_LARGE + 20}
        emptyStateText={EMPTY_STATE_MESSAGES.efficiency}
      >
        <ChartCanvas
          dataPoints={dataPoints}
          enableTooltips={true}
          accessibilityLabel="Learning efficiency chart showing progress over the past 14 days"
        >
          {/* Performance zones background */}
          <Group>
            {chartData.performanceZones.map((zone, index) => (
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

          {/* Area fill under the efficiency line with gradient */}
          <Group>
            {chartData.efficiencyPath && (
              <Path
                path={createAreaFillPath(chartData.efficiencyPath, GRAPH_WIDTH, GRAPH_HEIGHT_LARGE)}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, GRAPH_HEIGHT_LARGE)}
                  colors={chartColors.getAreaFillGradient('efficiency')}
                  positions={[0, 0.3, 0.7, 1]}
                />
              </Path>
            )}
          </Group>

          {/* Efficiency line */}
          <Group>
            <Path
              path={chartData.efficiencyPath}
              style="stroke"
              strokeWidth={3}
              strokeCap="round"
              strokeJoin="round"
              color={chartColors.ui.dataLine}
            />

            {/* Data points with enhanced styling */}
            {chartData.dataPoints.map((point, index) => {
              const data = efficiencyData[index];
              if (!data || data.wordCount === 0) return null;

              return (
                <Group key={`efficiency-point-${index}`}>
                  {/* Subtle glow ring */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={6}
                    color={chartColors.getDataPointGlow('efficiency')}
                  />
                  {/* Main data point */}
                  <Circle cx={point.x} cy={point.y} r={4} color={chartColors.ui.dataLine} />
                </Group>
              );
            })}
          </Group>
        </ChartCanvas>
      </BaseChart>
    );
  }
);

EfficiencyChart.displayName = 'EfficiencyChart';
