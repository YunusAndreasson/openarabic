import React, { memo, useMemo } from 'react';
import { Path, Circle, Group, Skia, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import {
  calculateRetrievability,
  createStandardizedPerformanceZones,
  generatePerformanceSubtitle,
  createAreaFillPath,
} from '../shared/utils';
import { useChartColors } from '../shared/chartColors';
import { BaseChart, ChartCanvas, type DataPoint } from '../shared';
import {
  GRAPH_WIDTH,
  GRAPH_HEIGHT_LARGE,
  DAYS_14,
  CRITICAL_RETRIEVABILITY_THRESHOLD,
} from '../shared/constants';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  onStatPress?: (category: StatCategory) => void;
  hideTitle?: boolean;
}

export const RetrievabilityChart = memo(
  ({ studyWords = [], onInfoPress, onStatPress, hideTitle = false }: RetrievabilityChartProps) => {
    const chartColors = useChartColors();

    // Calculate retrievability forecast over the next 14 days
    const retrievabilityData = useMemo(() => {
      const today = new Date();
      const dates: Date[] = [];

      // Generate future dates for forecast
      for (let i = 0; i < DAYS_14; i++) {
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

      // Define memory zones using standardized utility (mapped to memory colors)
      const dangerZones = createStandardizedPerformanceZones(
        GRAPH_HEIGHT_LARGE,
        0,
        chartColors
      ).map(zone => ({
        ...zone,
        // Map performance colors to memory colors for semantic consistency
        color:
          zone.name === 'Excellent'
            ? chartColors.memory.strong
            : zone.name === 'Good'
              ? chartColors.memory.fading
              : zone.name === 'Fair'
                ? chartColors.memory.fading
                : chartColors.memory.weak,
        // Adjust for retrievability chart scaling
        y:
          GRAPH_HEIGHT_LARGE -
          ((zone.min + (zone.max - zone.min)) / maxRetrievability) * GRAPH_HEIGHT_LARGE,
        height: ((zone.max - zone.min) / maxRetrievability) * GRAPH_HEIGHT_LARGE,
      }));

      // Calculate insights
      const week1 = retrievabilityData.slice(0, 7);
      const week2 = retrievabilityData.slice(7, 14);

      const currentRetrievability = retrievabilityData[0]?.averageRetrievability || 0;
      const week1Avg =
        week1.reduce((sum, day) => sum + day.averageRetrievability, 0) / week1.length;
      const week2Avg =
        week2.reduce((sum, day) => sum + day.averageRetrievability, 0) / week2.length;

      const change = week1Avg - week2Avg;
      const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';
      const criticalWords = retrievabilityData[0]?.criticalWords || 0;

      return {
        retrievabilityPath: path.toSVGString(),
        hasData,
        dangerZones,
        dataPoints: points,
        insights: {
          currentRetrievability: Math.round(currentRetrievability),
          trend,
          criticalWords,
        },
      };
    }, [retrievabilityData, chartColors]);

    // Generate subtitle using shared utility with custom logic for critical words
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords } = chartData.insights;

      if (currentRetrievability === 0) {
        return 'Study words to see memory tracking';
      }
      if (criticalWords > 10) {
        return `${criticalWords} words need review soon`;
      }
      return generatePerformanceSubtitle(
        currentRetrievability,
        'memory retention',
        chartData.insights.trend as 'improving' | 'declining' | 'stable'
      );
    }, [chartData.insights]);

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

    return (
      <BaseChart
        title="Memory"
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={chartData.hasData}
        leftStat={{
          value: `${chartData.insights.currentRetrievability}%`,
          label: 'retention',
          color: chartColors.memory.strong,
        }}
        rightStat={{
          value: chartData.insights.criticalWords,
          label: 'critical',
          color: chartColors.memory.weak,
          onPress: onStatPress ? () => onStatPress('needsAttention') : undefined,
        }}
        legendItems={[
          {
            type: 'line',
            color: chartColors.ui.dataLine,
            label: 'Memory retention',
          },
        ]}
        timeRange="Next 14 days"
        contentHeight={GRAPH_HEIGHT_LARGE}
        emptyStateText="Study words to see memory tracking"
      >
        <ChartCanvas
          dataPoints={dataPoints}
          enableTooltips={true}
          accessibilityLabel="Memory retention forecast showing expected retention over the next 14 days"
        >
          {/* Memory zones background */}
          <Group>
            {chartData.dangerZones.map((zone, index) => (
              <Rect
                key={`memory-zone-${index}`}
                x={0}
                y={zone.y}
                width={GRAPH_WIDTH}
                height={zone.height}
                color={chartColors.withOpacity(zone.color, 0.12)}
              />
            ))}
          </Group>

          {/* Critical threshold line */}
          <Group>
            <Rect
              x={0}
              y={
                GRAPH_HEIGHT_LARGE -
                ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100) / 100) * GRAPH_HEIGHT_LARGE
              }
              width={GRAPH_WIDTH}
              height={1}
              color={chartColors.withOpacity(chartColors.memory.weak, 0.5)}
            />
          </Group>

          {/* Area fill under the retrievability line */}
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

          {/* Main retrievability line */}
          <Group>
            <Path
              path={chartData.retrievabilityPath}
              style="stroke"
              strokeWidth={3}
              strokeCap="round"
              strokeJoin="round"
              color={chartColors.ui.dataLine}
            />

            {/* Data points with enhanced styling */}
            {chartData.dataPoints.map((point, index) => {
              const data = retrievabilityData[index];
              if (!data || data.wordCount === 0) return null;

              // Color code points based on criticality
              const pointColor =
                point.retrievability < CRITICAL_RETRIEVABILITY_THRESHOLD * 100
                  ? chartColors.memory.weak
                  : point.retrievability < 85
                    ? chartColors.memory.fading
                    : chartColors.memory.strong;

              return (
                <Group key={`retrievability-point-${index}`}>
                  {/* Subtle glow ring */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={6}
                    color={chartColors.withOpacity(pointColor, 0.3)}
                  />
                  {/* Main data point */}
                  <Circle cx={point.x} cy={point.y} r={4} color={pointColor} />
                </Group>
              );
            })}
          </Group>
        </ChartCanvas>
      </BaseChart>
    );
  }
);

RetrievabilityChart.displayName = 'RetrievabilityChart';
