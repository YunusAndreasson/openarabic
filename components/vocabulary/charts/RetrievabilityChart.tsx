import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Circle, Group, Shadow, Skia, Rect } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import {
  GRAPH_WIDTH,
  GRAPH_HEIGHT_LARGE,
  DAYS_30,
  CRITICAL_RETRIEVABILITY_THRESHOLD,
} from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { calculateRetrievability } from '../shared/utils';
import { useChartColors } from '../shared/chartColors';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const RetrievabilityChart = memo(
  ({ studyWords = [], onInfoPress }: RetrievabilityChartProps) => {
    const colors = useColors();
    const chartColors = useChartColors();

    // Calculate retrievability forecast over the next 30 days
    const retrievabilityData = useMemo(() => {
      const today = new Date();
      const dates: Date[] = [];

      // Generate future dates for forecast
      for (let i = 0; i < DAYS_30; i++) {
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

      // Define danger zones for memory retention using consistent colors
      const dangerZones = [
        {
          name: 'Safe Zone',
          min: CRITICAL_RETRIEVABILITY_THRESHOLD * 100,
          max: 100,
          color: chartColors.memory.strong,
          y: 0,
          height:
            GRAPH_HEIGHT_LARGE -
            ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100) / maxRetrievability) * GRAPH_HEIGHT_LARGE,
        },
        {
          name: 'At Risk',
          min: 50,
          max: CRITICAL_RETRIEVABILITY_THRESHOLD * 100,
          color: chartColors.memory.fading,
          y:
            GRAPH_HEIGHT_LARGE -
            ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100) / maxRetrievability) * GRAPH_HEIGHT_LARGE,
          height:
            ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100 - 50) / maxRetrievability) *
            GRAPH_HEIGHT_LARGE,
        },
        {
          name: 'Critical',
          min: 0,
          max: 50,
          color: chartColors.memory.weak,
          y: GRAPH_HEIGHT_LARGE - (50 / maxRetrievability) * GRAPH_HEIGHT_LARGE,
          height: (50 / maxRetrievability) * GRAPH_HEIGHT_LARGE,
        },
      ];

      // Calculate insights
      const week1 = retrievabilityData.slice(0, 7);
      const week2 = retrievabilityData.slice(7, 14);

      const currentRetrievability = retrievabilityData[0]?.averageRetrievability || 0;
      const week1Avg =
        week1.reduce((sum, day) => sum + day.averageRetrievability, 0) / week1.length;
      const week2Avg =
        week2.reduce((sum, day) => sum + day.averageRetrievability, 0) / week2.length;

      const change = week1Avg - week2Avg;
      const trend = change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';
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

    // Generate subtitle based on retrievability forecast
    const subtitle = useMemo(() => {
      const { currentRetrievability, criticalWords } = chartData.insights;

      if (currentRetrievability === 0) {
        return 'Review words to track retention';
      }
      if (criticalWords > 10) {
        return `⚠️ ${criticalWords} words need urgent review`;
      }
      if (criticalWords > 5) {
        return `⚡ ${criticalWords} words approaching forgetting`;
      }
      if (currentRetrievability >= 80) {
        return 'Excellent memory retention! 🧠';
      }
      if (currentRetrievability >= 60) {
        return 'Good memory retention 👍';
      }
      return 'Focus on review to strengthen memory 💪';
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
              title="Memory Retention"
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
          <CardHeader title="Memory Retention" subtitle={subtitle} onInfoPress={onInfoPress} />

          <StatsRow
            leftStat={{
              value: `${chartData.insights.currentRetrievability}%`,
              label: 'retention today',
              color: chartColors.getRetrievabilityColor(
                chartData.insights.currentRetrievability / 100
              ),
            }}
            rightStat={{
              value: chartData.insights.criticalWords,
              label: 'need review',
              color:
                chartData.insights.criticalWords > 5
                  ? chartColors.memory.weak
                  : chartColors.memory.strong,
            }}
          />

          {/* Enhanced Retrievability Graph */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
              {/* Memory zones background */}
              <Group>
                {chartData.dangerZones.map((zone, index) => (
                  <Rect
                    key={`zone-${index}`}
                    x={0}
                    y={zone.y}
                    width={GRAPH_WIDTH}
                    height={zone.height}
                    color={chartColors.withOpacity(zone.color, 0.05)}
                  />
                ))}
              </Group>

              {/* Grid lines */}
              <Group>
                {[0.25, 0.5, 0.75].map((ratio, index) => (
                  <Rect
                    key={`grid-line-${index}`}
                    x={0}
                    y={GRAPH_HEIGHT_LARGE * ratio - 0.5}
                    width={GRAPH_WIDTH}
                    height={1}
                    color={chartColors.ui.grid}
                  />
                ))}
              </Group>

              {/* Area fill under the retrievability line */}
              <Group>
                {chartData.smoothPath && (
                  <Path
                    path={`${chartData.smoothPath} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE} L 0 ${GRAPH_HEIGHT_LARGE} Z`}
                    color={chartColors.withOpacity(chartColors.memory.strong, 0.15)}
                  />
                )}
              </Group>

              {/* Retrievability line */}
              <Group>
                {chartData.smoothPath && (
                  <Path
                    path={chartData.smoothPath}
                    style="stroke"
                    strokeWidth={3}
                    color={chartColors.memory.strong}
                  >
                    <Shadow
                      dx={0}
                      dy={2}
                      blur={4}
                      color={chartColors.withOpacity(chartColors.memory.strong, 0.3)}
                    />
                  </Path>
                )}
              </Group>

              {/* Data points */}
              <Group>
                {retrievabilityData
                  .filter(d => d.wordCount > 0)
                  .slice(0, 15) // Show first 15 days for clarity
                  .map((data, index) => {
                    const x = index * (GRAPH_WIDTH / (retrievabilityData.length - 1));
                    const y =
                      GRAPH_HEIGHT_LARGE -
                      (data.averageRetrievability / (chartData.maxRetrievability || 1)) *
                        GRAPH_HEIGHT_LARGE;

                    return (
                      <Group key={`retrievability-point-${index}`}>
                        <Circle
                          cx={x}
                          cy={y}
                          r={4}
                          color={chartColors.getRetrievabilityColor(
                            data.averageRetrievability / 100
                          )}
                        >
                          <Shadow
                            dx={0}
                            dy={1}
                            blur={2}
                            color={chartColors.withOpacity(chartColors.memory.strong, 0.4)}
                          />
                        </Circle>
                        <Circle cx={x} cy={y} r={2} color={colors.white} />
                      </Group>
                    );
                  })}
              </Group>
            </Canvas>
          </View>

          <ChartFooter
            legendItems={[
              { type: 'line', color: chartColors.memory.strong, label: 'Retention' },
              { type: 'dot', color: chartColors.memory.fading, label: 'At Risk' },
              { type: 'dot', color: chartColors.memory.weak, label: 'Critical' },
            ]}
            timeRange="Next 30 days"
          />
        </View>
      </BaseCard>
    );
  }
);

RetrievabilityChart.displayName = 'RetrievabilityChart';

const styles = StyleSheet.create({
  retrievabilityCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  retrievabilityContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
});
