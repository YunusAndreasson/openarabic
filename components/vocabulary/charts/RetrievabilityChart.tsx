import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Group,
  Skia,
  Rect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';

import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import {
  GRAPH_WIDTH,
  GRAPH_HEIGHT_LARGE,
  DAYS_14,
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  CHART_LAYOUT,
} from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import {
  calculateRetrievability,
  createStandardizedPerformanceZones,
  generatePerformanceSubtitle,
  createAreaFillPath,
} from '../shared/utils';
import { useChartColors } from '../shared/chartColors';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const RetrievabilityChart = memo(
  ({ studyWords = [], onInfoPress }: RetrievabilityChartProps) => {
    const colors = useColors();
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
          smoothPath: '',
          hasData: false,
          insights: { currentRetrievability: 0, trend: 'stable' as const, criticalWords: 0 },
          dangerZones: [],
        };
      }

      const hasData = retrievabilityData.some(d => d.wordCount > 0);

      if (!hasData) {
        return {
          retrievabilityPath: '',
          smoothPath: '',
          hasData: false,
          insights: { currentRetrievability: 0, trend: 'stable' as const, criticalWords: 0 },
          dangerZones: [],
        };
      }

      const maxRetrievability = Math.max(
        100,
        Math.max(...retrievabilityData.map(d => d.averageRetrievability))
      );
      const stepX = GRAPH_WIDTH / (retrievabilityData.length - 1);

      // Create smooth curve using Skia Path
      const path = Skia.Path.Make();
      const points: { x: number; y: number; retrievability: number }[] = [];

      retrievabilityData.forEach((data, index) => {
        const x = index * stepX;
        const y =
          GRAPH_HEIGHT_LARGE -
          (data.averageRetrievability / maxRetrievability) * GRAPH_HEIGHT_LARGE;
        points.push({ x, y, retrievability: data.averageRetrievability });

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
        smoothPath: path.toSVGString(),
        hasData,
        maxRetrievability,
        dangerZones,
        insights: {
          currentRetrievability: Math.round(currentRetrievability * 10) / 10,
          trend,
          criticalWords,
        },
      };
    }, [retrievabilityData, chartColors]);

    // Generate subtitle using shared utility with custom logic for critical words
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords } = chartData.insights;

      if (currentRetrievability === 0) {
        return 'Review words to track retention';
      }
      if (criticalWords > 10) {
        return `${criticalWords} words need urgent review`;
      }
      if (criticalWords > 5) {
        return `${criticalWords} words approaching forgetting`;
      }

      return generatePerformanceSubtitle(currentRetrievability, 'memory retention');
    }, [chartData.insights]);

    if (!chartData.hasData) {
      return (
        <BaseCard
          style={styles.retrievabilityCard}
          shadowSize="small"
          includePressAnimation={false}
        >
          <View style={styles.retrievabilityContent}>
            <CardHeader
              title="Retention"
              subtitle="Forecast of vocabulary retention over time"
              onInfoPress={onInfoPress}
            />
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard style={styles.retrievabilityCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.retrievabilityContent}>
          <CardHeader title="Retention" subtitle={subtitle} onInfoPress={onInfoPress} />

          <StatsRow
            leftStat={{
              value: `${chartData.insights.currentRetrievability}%`,
              label: 'current',
              color: chartColors.getRetrievabilityColor(
                chartData.insights.currentRetrievability / 100
              ),
            }}
            rightStat={{
              value: chartData.insights.criticalWords,
              label: 'at risk',
              color:
                chartData.insights.criticalWords > 5
                  ? chartColors.memory.weak
                  : chartColors.memory.strong,
            }}
          />

          {/* Enhanced Retrievability Graph */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
              {/* Memory zones background - more prominent */}
              <Group>
                {chartData.dangerZones.map((zone, index) => (
                  <Group key={`zone-group-${index}`}>
                    {/* Zone background */}
                    <Rect
                      x={0}
                      y={zone.y}
                      width={GRAPH_WIDTH}
                      height={zone.height}
                      color={chartColors.withOpacity(zone.color, 0.12)}
                    />
                  </Group>
                ))}
              </Group>

              {/* Grid lines - prominent for better 14-day indication */}
              <Group>
                {/* Vertical grid lines for 14-day indication */}
                <Group>
                  {/* Vertical grid lines for each day */}
                  {retrievabilityData.map((_, index) => {
                    const x = (index / Math.max(1, retrievabilityData.length - 1)) * GRAPH_WIDTH;
                    return (
                      <Rect
                        key={`day-grid-${index}`}
                        x={x - 0.5}
                        y={0}
                        width={1}
                        height={GRAPH_HEIGHT_LARGE}
                        color={chartColors.withOpacity(chartColors.ui.border, 0.12)}
                      />
                    );
                  })}
                </Group>
              </Group>

              {/* Area fill under the retrievability line with gradient */}
              <Group>
                {chartData.smoothPath && (
                  <Path
                    path={createAreaFillPath(chartData.smoothPath, GRAPH_WIDTH, GRAPH_HEIGHT_LARGE)}
                  >
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(0, GRAPH_HEIGHT_LARGE)}
                      colors={chartColors.getAreaFillGradient('retrievability')}
                      positions={[0, 0.35, 0.75, 1]}
                    />
                  </Path>
                )}
              </Group>

              {/* Retrievability line */}
              <Group>
                {chartData.smoothPath && (
                  <Path
                    path={chartData.smoothPath}
                    style="stroke"
                    strokeWidth={3}
                    strokeCap="round"
                    strokeJoin="round"
                    color={chartColors.ui.dataLine}
                  />
                )}

                {/* Data points for forecast visualization */}
                {retrievabilityData.map((data, index) => {
                  if (data.wordCount === 0) return null;

                  const x = (index / Math.max(1, retrievabilityData.length - 1)) * GRAPH_WIDTH;
                  const y =
                    GRAPH_HEIGHT_LARGE -
                    (data.averageRetrievability / (chartData.maxRetrievability || 100)) *
                      GRAPH_HEIGHT_LARGE;

                  // Show different styling for current day vs forecast
                  const isToday = index === 0;
                  const glowOpacity = isToday ? 0.6 : 0.3;

                  return (
                    <Group key={`retrievability-point-${index}`}>
                      {/* Subtle glow ring */}
                      <Circle
                        cx={x}
                        cy={y}
                        r={isToday ? 7 : 6}
                        color={chartColors.withOpacity(chartColors.ui.dataLine, glowOpacity)}
                      />
                      {/* Main data point */}
                      <Circle cx={x} cy={y} r={isToday ? 5 : 4} color={chartColors.ui.dataLine} />
                    </Group>
                  );
                })}
              </Group>

              {/* Data points */}
              {/* Removed individual dots as they don't make sense for forecasted averages */}
            </Canvas>
          </View>

          <ChartFooter
            legendItems={[
              {
                type: 'line',
                color: chartColors.ui.dataLine,
                label: 'Retention',
              },
            ]}
            timeRange="Next 14 days"
          />
        </View>
      </BaseCard>
    );
  }
);

RetrievabilityChart.displayName = 'RetrievabilityChart';

const styles = StyleSheet.create({
  retrievabilityCard: {},
  retrievabilityContent: {
    padding: CHART_LAYOUT.CONTENT_PADDING,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING,
    marginHorizontal: CHART_LAYOUT.GRAPH_MARGIN_HORIZONTAL,
    paddingVertical: CHART_LAYOUT.GRAPH_MARGIN_VERTICAL,
  },
});
