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
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  CHART_VISUAL,
} from '../shared/constants';
import {
  calculateRetrievability,
  createStandardizedPerformanceZones,
  generatePerformanceSubtitle,
  createAreaFillPath,
} from '../shared/utils';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  onStatPress?: (category: StatCategory) => void;
  hideTitle?: boolean;
}

export const RetrievabilityChart = memo(
  ({ studyWords = [], onInfoPress, onStatPress, hideTitle = false }: RetrievabilityChartProps) => {
    const chartColors = useChartColors();
    const colors = useColors();

    // Calculate retrievability forecast over the next 7 days
    const retrievabilityData = useMemo(() => {
      const today = new Date();
      const dates: Date[] = [];

      // Generate future dates for forecast
      for (let i = 0; i < DAYS_7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
      }

      return dates.map(date => {
        let totalRetrievability = 0;
        let wordCount = 0;
        let criticalWords = 0;
        let urgentWords = 0;

        studyWords.forEach(word => {
          // Only include words that have been reviewed
          if (word.fsrs_last_review && (word.fsrs_reps ?? 0) > 0) {
            const retrievability = calculateRetrievability(word, date);
            totalRetrievability += retrievability;
            wordCount++;

            if (retrievability < CRITICAL_RETRIEVABILITY_THRESHOLD) {
              criticalWords++;
            }
            if (retrievability < 0.5) {
              urgentWords++;
            }
          }
        });

        const averageRetrievability = wordCount > 0 ? (totalRetrievability / wordCount) * 100 : 0;
        return { date, averageRetrievability, wordCount, criticalWords, urgentWords };
      });
    }, [studyWords]);

    // Calculate chart data and insights
    const chartData = useMemo(() => {
      if (retrievabilityData.length === 0) {
        return {
          retrievabilityPath: '',
          hasData: false,
          insights: { currentRetrievability: 0, trend: 'stable' as const, criticalWords: 0 },
          dangerZones: [],
          dataPoints: [],
        };
      }

      const hasData = retrievabilityData.some(d => d.wordCount > 0);

      if (!hasData) {
        return {
          retrievabilityPath: '',
          hasData: false,
          insights: { currentRetrievability: 0, trend: 'stable' as const, criticalWords: 0 },
          dangerZones: [],
          dataPoints: [],
        };
      }

      const maxRetrievability = Math.max(
        100,
        Math.max(...retrievabilityData.map(d => d.averageRetrievability))
      );
      const stepX = GRAPH_WIDTH / (retrievabilityData.length - 1);

      // Create smooth curve using Skia Path
      const path = Skia.Path.Make();
      const points: { x: number; y: number; retrievability: number; date: Date }[] = [];

      retrievabilityData.forEach((data, index) => {
        const x = index * stepX;
        const y =
          GRAPH_HEIGHT_LARGE -
          (data.averageRetrievability / maxRetrievability) * GRAPH_HEIGHT_LARGE;
        points.push({ x, y, retrievability: data.averageRetrievability, date: data.date });

        if (index === 0) {
          path.moveTo(x, y);
        } else {
          // Create smooth curves using quadratic bezier
          const prevPoint = points[index - 1];
          const controlX = (prevPoint!.x + x) / 2;
          path.quadTo(controlX, prevPoint!.y, x, y);
        }
      });

      // Define standardized performance zones - same as other charts
      const performanceZones = createStandardizedPerformanceZones(
        GRAPH_HEIGHT_LARGE,
        0,
        chartColors
      );

      // Calculate insights
      const firstHalf = retrievabilityData.slice(0, 4); // First 4 days
      const secondHalf = retrievabilityData.slice(4, 7); // Last 3 days

      const currentRetrievability = retrievabilityData[0]?.averageRetrievability || 0;
      const firstHalfAvg =
        firstHalf.reduce((sum, day) => sum + day.averageRetrievability, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, day) => sum + day.averageRetrievability, 0) / secondHalf.length;

      const change = firstHalfAvg - secondHalfAvg;
      const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';
      const criticalWords = retrievabilityData[0]?.criticalWords || 0;

      return {
        retrievabilityPath: path.toSVGString(),
        hasData,
        dangerZones: performanceZones,
        dataPoints: points,
        insights: {
          currentRetrievability: Math.round(currentRetrievability),
          trend,
          criticalWords,
        },
      };
    }, [retrievabilityData, chartColors]);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords } = chartData.insights;
      const totalWords = studyWords.length;

      if (totalWords === 0) {
        return 'Study words to track memory retention';
      }

      // Use standardized subtitle generator
      return generateChartSubtitle.retrievability(currentRetrievability, criticalWords, totalWords);
    }, [chartData.insights, studyWords.length]);

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint[] = useMemo(() => {
      return chartData.dataPoints
        .map((point, index) => {
          const data = retrievabilityData[index];
          if (!data || data.wordCount === 0) return null;

          return {
            x: point.x,
            y: point.y,
            value: `${Math.round(point.retrievability)}%`,
            label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            data: data,
          } as DataPoint;
        })
        .filter((point): point is DataPoint => point !== null);
    }, [chartData.dataPoints, retrievabilityData]);

    // Create standardized stats using new messaging system
    const { leftStat, rightStat } = useMemo(() => {
      if (!chartData.hasData) {
        return createStandardizedStats.retrievability(
          0,
          0,
          chartColors.performance.poor,
          chartColors.performance.poor,
          onStatPress
        );
      }

      return createStandardizedStats.retrievability(
        chartData.insights.currentRetrievability,
        chartData.insights.criticalWords,
        chartColors.getPerformanceColor(chartData.insights.currentRetrievability),
        chartColors.performance.poor, // Red for critical words
        onStatPress
      );
    }, [chartData, chartColors, onStatPress]);

    return (
      <BaseChart
        title={CHART_LABELS.RETENTION}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        leftStat={leftStat}
        rightStat={rightStat}
        contentHeight={GRAPH_HEIGHT_LARGE + 32} // Optimized space for axis labels aligned with card padding
        emptyStateText={EMPTY_STATE_MESSAGES.retrievability}
      >
        <View style={{ position: 'relative' }}>
          <View style={{ marginLeft: Y_AXIS_WIDTH }}>
            <ChartCanvas
              dataPoints={dataPoints}
              enableTooltips={true}
              accessibilityLabel="Memory retention forecast showing expected retention over the next 7 days"
            >
              {/* Subtle grid lines for better visual structure */}
              <ChartGrid width={GRAPH_WIDTH} height={GRAPH_HEIGHT_LARGE} gridLines={4} />

              {/* Area fill under the retrievability line - rendered first as base */}
              <Group>
                {chartData.retrievabilityPath && (
                  <Path
                    path={createAreaFillPath(
                      chartData.retrievabilityPath,
                      GRAPH_WIDTH,
                      GRAPH_HEIGHT_LARGE
                    )}
                  >
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      colors={chartColors.getAreaFillGradient('retrievability')}
                      positions={[0, 0.3, 0.7, 1]}
                    />
                  </Path>
                )}
              </Group>

              {/* Performance zones background - masked to only show below the data line */}
              <Group>
                {chartData.retrievabilityPath && (
                  <Mask
                    mask={
                      <Path
                        path={createAreaFillPath(
                          chartData.retrievabilityPath,
                          GRAPH_WIDTH,
                          GRAPH_HEIGHT_LARGE
                        )}
                        color="white"
                      />
                    }
                  >
                    {chartData.dangerZones.map((zone, index) => (
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

              {/* Main retrievability line with brand accent color */}
              <Group>
                <Path
                  path={chartData.retrievabilityPath}
                  style="stroke"
                  strokeWidth={CHART_VISUAL.LINE_WIDTH}
                  strokeCap="round"
                  strokeJoin="round"
                  color={chartColors.ui.accent}
                />

                {/* Data points with enhanced styling */}
                {chartData.dataPoints.map((point, index) => {
                  const data = retrievabilityData[index];
                  if (!data || data.wordCount === 0) return null;

                  return (
                    <Group key={`retrievability-point-${index}`}>
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
                  );
                })}
              </Group>
            </ChartCanvas>
          </View>

          {/* Enhanced axis labels with proper padding and y-axis values */}
          <ChartAxes
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT_LARGE}
            xLabels={retrievabilityData
              .filter(data => data && data.wordCount > 0)
              .map((data, index) =>
                index === 0 ? 'Today' : data.date.toLocaleDateString('en-US', { weekday: 'short' })
              )}
            xLabelPositions={chartData.dataPoints.map(point => point.x)}
            yMax={100}
            showYAxis={true}
            topPadding={0}
          />
        </View>
      </BaseChart>
    );
  }
);

RetrievabilityChart.displayName = 'RetrievabilityChart';

// Styles removed - now using ChartAxes component
