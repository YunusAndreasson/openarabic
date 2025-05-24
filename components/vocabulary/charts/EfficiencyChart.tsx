import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Circle, Group, Shadow, Skia, Rect } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { generateDateRange, isSameDay, calculateEfficiencyScore } from '../shared/utils';
import { useChartColors } from '../shared/chartColors';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_30 } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';

interface EfficiencyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const EfficiencyChart = memo(({ studyWords = [], onInfoPress }: EfficiencyChartProps) => {
  const colors = useColors();
  const chartColors = useChartColors();

  // Calculate efficiency data over the last 30 days
  const efficiencyData = useMemo(() => {
    const dates = generateDateRange(DAYS_30);

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
        smoothPath: '',
        hasData: false,
        insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
        performanceZones: [],
      };
    }

    const hasData = efficiencyData.some(d => d.wordCount > 0);

    if (!hasData) {
      return {
        efficiencyPath: '',
        smoothPath: '',
        hasData: false,
        insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
        performanceZones: [],
      };
    }

    const maxEfficiency = Math.max(100, Math.max(...efficiencyData.map(d => d.averageEfficiency)));
    const stepX = GRAPH_WIDTH / (efficiencyData.length - 1);

    // Create smooth curve using Skia Path
    const path = Skia.Path.Make();
    const points: { x: number; y: number; efficiency: number }[] = [];

    efficiencyData.forEach((data, index) => {
      const x = index * stepX;
      const y = GRAPH_HEIGHT_LARGE - (data.averageEfficiency / maxEfficiency) * GRAPH_HEIGHT_LARGE;
      points.push({ x, y, efficiency: data.averageEfficiency });

      if (index === 0) {
        path.moveTo(x, y);
      } else {
        // Create smooth curves using quadratic bezier
        const prevPoint = points[index - 1];
        const controlX = (prevPoint!.x + x) / 2;
        path.quadTo(controlX, prevPoint!.y, x, y);
      }
    });

    // Define performance zones using consistent color system
    const performanceZones = [
      {
        name: 'Great',
        min: 80,
        max: 100,
        color: chartColors.performance.excellent,
        y: GRAPH_HEIGHT_LARGE - (80 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (20 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'Good',
        min: 60,
        max: 80,
        color: chartColors.performance.good,
        y: GRAPH_HEIGHT_LARGE - (80 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (20 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'OK',
        min: 40,
        max: 60,
        color: chartColors.performance.moderate,
        y: GRAPH_HEIGHT_LARGE - (60 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (20 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'Poor',
        min: 0,
        max: 40,
        color: chartColors.performance.poor,
        y: GRAPH_HEIGHT_LARGE - (40 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (40 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
    ];

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
    const trend = change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';

    return {
      efficiencyPath: path.toSVGString(),
      smoothPath: path.toSVGString(),
      hasData,
      maxEfficiency,
      performanceZones,
      insights: {
        currentEfficiency: Math.round(currentEfficiency * 10) / 10,
        trend,
        weeklyAverage: Math.round(recentAvg * 10) / 10,
      },
    };
  }, [efficiencyData, chartColors]);

  // Generate subtitle based on efficiency trend
  const subtitle = useMemo(() => {
    const { currentEfficiency, trend } = chartData.insights;

    if (currentEfficiency === 0) {
      return 'Study some words to see your progress';
    }
    if (trend === 'improving') {
      return 'Getting better! 📈';
    }
    if (trend === 'declining') {
      return 'Try different study methods 🔄';
    }
    if (currentEfficiency >= 80) {
      return 'Great job! 🎯';
    }
    if (currentEfficiency >= 60) {
      return 'Good work 👍';
    }
    return 'Room to improve 💡';
  }, [chartData.insights]);

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.efficiencyCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.efficiencyContent}>
          <CardHeader
            title="How Well You Learn"
            subtitle="Study some words to see your progress"
            onInfoPress={onInfoPress}
          />
        </View>
      </BaseCard>
    );
  }

  return (
    <BaseCard style={styles.efficiencyCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.efficiencyContent}>
        <CardHeader title="How Well You Learn" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: `${chartData.insights.currentEfficiency}%`,
            label: 'today',
            color: chartColors.getPerformanceColor(chartData.insights.currentEfficiency),
          }}
          rightStat={{
            value: `${chartData.insights.weeklyAverage}%`,
            label: 'this week',
          }}
        />

        {/* Enhanced Efficiency Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Background zones - more subtle */}
            <Group>
              {chartData.performanceZones.map((zone, index) => (
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

            {/* Efficiency threshold line at 60% */}
            <Group>
              {chartData.maxEfficiency && (
                <Rect
                  x={0}
                  y={GRAPH_HEIGHT_LARGE - (60 / chartData.maxEfficiency) * GRAPH_HEIGHT_LARGE - 0.5}
                  width={GRAPH_WIDTH}
                  height={1}
                  color={chartColors.withOpacity(chartColors.performance.moderate, 0.6)}
                />
              )}
            </Group>

            {/* Area fill under the efficiency line */}
            <Group>
              {chartData.smoothPath && (
                <Path
                  path={`${chartData.smoothPath} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE} L 0 ${GRAPH_HEIGHT_LARGE} Z`}
                  color={chartColors.withOpacity(chartColors.performance.excellent, 0.15)}
                />
              )}
            </Group>

            {/* Main efficiency line */}
            <Group>
              {chartData.smoothPath && (
                <Path
                  path={chartData.smoothPath}
                  style="stroke"
                  strokeWidth={3}
                  color={chartColors.performance.excellent}
                >
                  <Shadow
                    dx={0}
                    dy={2}
                    blur={4}
                    color={chartColors.withOpacity(chartColors.performance.excellent, 0.3)}
                  />
                </Path>
              )}
            </Group>

            {/* Data points - show every other point for clarity */}
            <Group>
              {efficiencyData
                .filter(d => d.wordCount > 0)
                .filter((_, index) => index % 2 === 0) // Show every other point for clarity
                .map((data, index) => {
                  const originalIndex = efficiencyData.findIndex(d => d === data);
                  const x = originalIndex * (GRAPH_WIDTH / (efficiencyData.length - 1));
                  const y =
                    GRAPH_HEIGHT_LARGE -
                    (data.averageEfficiency / (chartData.maxEfficiency || 1)) * GRAPH_HEIGHT_LARGE;

                  const pointColor = chartColors.getPerformanceColor(data.averageEfficiency);

                  return (
                    <Group key={`efficiency-point-${index}`}>
                      <Circle cx={x} cy={y} r={4} color={pointColor}>
                        <Shadow
                          dx={0}
                          dy={1}
                          blur={2}
                          color={chartColors.withOpacity(pointColor, 0.4)}
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
            { type: 'line', color: chartColors.performance.excellent, label: 'Learning' },
            { type: 'dot', color: chartColors.performance.good, label: 'Good' },
            { type: 'dot', color: chartColors.performance.moderate, label: 'OK' },
            { type: 'dot', color: chartColors.performance.poor, label: 'Poor' },
          ]}
          timeRange="Last 30 days"
        />
      </View>
    </BaseCard>
  );
});

EfficiencyChart.displayName = 'EfficiencyChart';

const styles = StyleSheet.create({
  efficiencyCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  efficiencyContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
});
