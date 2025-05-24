import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Circle, Group, vec, Shadow, Skia, Rect } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';

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
import { generateDateRange, calculateRetrievability } from '../shared/utils';

interface RetrievabilityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const RetrievabilityChart = memo(
  ({ studyWords = [], onInfoPress }: RetrievabilityChartProps) => {
    const colors = useColors();

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

      // Define danger zones for memory retention
      const dangerZones = [
        {
          name: 'Safe Zone',
          min: CRITICAL_RETRIEVABILITY_THRESHOLD * 100,
          max: 100,
          color: colors.success,
          y: 0,
          height:
            GRAPH_HEIGHT_LARGE -
            ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100) / maxRetrievability) * GRAPH_HEIGHT_LARGE,
        },
        {
          name: 'At Risk',
          min: 50,
          max: CRITICAL_RETRIEVABILITY_THRESHOLD * 100,
          color: colors.warning,
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
          color: colors.error,
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
    }, [retrievabilityData, colors]);

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
      return 'Consider more frequent reviews 🔄';
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
              subtitle="Predict and prevent vocabulary forgetting"
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
              label: 'retention rate',
              color:
                chartData.insights.currentRetrievability >= CRITICAL_RETRIEVABILITY_THRESHOLD * 100
                  ? colors.success
                  : chartData.insights.currentRetrievability >= 50
                    ? colors.warning
                    : colors.error,
            }}
            rightStat={{
              value: chartData.insights.criticalWords,
              label: 'words at risk',
              color: chartData.insights.criticalWords > 5 ? colors.error : colors.textSecondary,
            }}
          />

          {/* Enhanced Retrievability Graph */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
              {/* Risk zones background */}
              <Group>
                {/* Safe zone (80%+) */}
                <Rect
                  x={0}
                  y={0}
                  width={GRAPH_WIDTH}
                  height={
                    GRAPH_HEIGHT_LARGE -
                    ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100) / chartData.maxRetrievability!) *
                      GRAPH_HEIGHT_LARGE
                  }
                  color={withOpacity(colors.success, 0.08)}
                />
                {/* At risk zone (50-80%) */}
                <Rect
                  x={0}
                  y={
                    GRAPH_HEIGHT_LARGE -
                    ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100) / chartData.maxRetrievability!) *
                      GRAPH_HEIGHT_LARGE
                  }
                  width={GRAPH_WIDTH}
                  height={
                    ((CRITICAL_RETRIEVABILITY_THRESHOLD * 100 - 50) /
                      chartData.maxRetrievability!) *
                    GRAPH_HEIGHT_LARGE
                  }
                  color={withOpacity(colors.warning, 0.08)}
                />
                {/* Critical zone (0-50%) */}
                <Rect
                  x={0}
                  y={GRAPH_HEIGHT_LARGE - (50 / chartData.maxRetrievability!) * GRAPH_HEIGHT_LARGE}
                  width={GRAPH_WIDTH}
                  height={(50 / chartData.maxRetrievability!) * GRAPH_HEIGHT_LARGE}
                  color={withOpacity(colors.error, 0.08)}
                />
              </Group>

              {/* Minimal grid lines */}
              <Group>
                {[0.25, 0.5, 0.75].map((ratio, index) => (
                  <Path
                    key={`grid-line-${index}`}
                    path={`M 0 ${GRAPH_HEIGHT_LARGE * ratio} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE * ratio}`}
                    style="stroke"
                    strokeWidth={0.5}
                    color={withOpacity(colors.textSecondary || colors.text, 0.15)}
                  />
                ))}
              </Group>

              {/* Critical threshold line */}
              <Group>
                <Path
                  path={`M 0 ${GRAPH_HEIGHT_LARGE - (50 / chartData.maxRetrievability!) * GRAPH_HEIGHT_LARGE} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE - (50 / chartData.maxRetrievability!) * GRAPH_HEIGHT_LARGE}`}
                  style="stroke"
                  strokeWidth={2}
                  color={colors.error}
                />
              </Group>

              {/* Clean area fill */}
              <Group>
                <Path
                  path={`${chartData.smoothPath} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE} L 0 ${GRAPH_HEIGHT_LARGE} Z`}
                  color={withOpacity(colors.info, 0.15)}
                />
              </Group>

              {/* Main retention line */}
              <Group>
                <Path
                  path={chartData.smoothPath}
                  style="stroke"
                  strokeWidth={3}
                  color={colors.info}
                >
                  <Shadow dx={0} dy={1} blur={3} color={withOpacity(colors.info, 0.25)} />
                </Path>
              </Group>

              {/* Risk indicators - only show critical points */}
              <Group>
                {retrievabilityData.map((data, index) => {
                  if (data.wordCount > 0 && index % 5 === 0) {
                    // Show every 5th point
                    const x = (index * GRAPH_WIDTH) / (retrievabilityData.length - 1);
                    const y =
                      GRAPH_HEIGHT_LARGE -
                      (data.averageRetrievability / chartData.maxRetrievability!) *
                        GRAPH_HEIGHT_LARGE;

                    // Color based on risk level
                    let pointColor = colors.success;
                    if (data.averageRetrievability < 50) {
                      pointColor = colors.error;
                    } else if (
                      data.averageRetrievability <
                      CRITICAL_RETRIEVABILITY_THRESHOLD * 100
                    ) {
                      pointColor = colors.warning;
                    }

                    return (
                      <Group key={`retrievability-point-${index}`}>
                        <Circle cx={x} cy={y} r={4} color={pointColor}>
                          <Shadow dx={0} dy={1} blur={2} color={withOpacity(pointColor, 0.3)} />
                        </Circle>
                        <Circle cx={x} cy={y} r={1.5} color={colors.background} />
                      </Group>
                    );
                  }
                  return null;
                })}
              </Group>
            </Canvas>
          </View>

          <ChartFooter
            legendItems={[
              { type: 'area', color: colors.info, label: 'Memory' },
              { type: 'line', color: colors.error, label: 'Risk line' },
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
