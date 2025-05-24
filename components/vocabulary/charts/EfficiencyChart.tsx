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
        name: 'Excellent',
        min: 80,
        max: 100,
        color: chartColors.performance.excellent,
        y: GRAPH_HEIGHT_LARGE - (100 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (20 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'Good',
        min: 60,
        max: 79,
        color: chartColors.performance.good,
        y: GRAPH_HEIGHT_LARGE - (79 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (19 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'Fair',
        min: 40,
        max: 59,
        color: chartColors.performance.moderate,
        y: GRAPH_HEIGHT_LARGE - (59 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (19 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'Needs Work',
        min: 0,
        max: 39,
        color: chartColors.performance.poor,
        y: GRAPH_HEIGHT_LARGE - (39 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (39 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
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
    const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';

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
      return 'Learning efficiency is improving';
    }
    if (trend === 'declining') {
      return 'Try different study methods';
    }
    if (currentEfficiency >= 80) {
      return 'Excellent learning efficiency';
    }
    if (currentEfficiency >= 60) {
      return 'Good learning efficiency';
    }
    return 'Room for improvement in efficiency';
  }, [chartData.insights]);

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.efficiencyCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.efficiencyContent}>
          <CardHeader
            title="Learning Efficiency"
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
        <CardHeader title="Learning Efficiency" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: `${chartData.insights.currentEfficiency}%`,
            label: 'current efficiency',
            color: chartColors.getPerformanceColor(chartData.insights.currentEfficiency),
          }}
          rightStat={{
            value: `${chartData.insights.weeklyAverage}%`,
            label: 'weekly average',
          }}
        />

        {/* Enhanced Efficiency Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Background zones - more prominent */}
            <Group>
              {chartData.performanceZones.map((zone, index) => (
                <Group key={`zone-group-${index}`}>
                  {/* Zone background */}
                  <Rect
                    x={0}
                    y={zone.y}
                    width={GRAPH_WIDTH}
                    height={zone.height}
                    color={chartColors.withOpacity(zone.color, 0.12)}
                  />
                  {/* Zone border */}
                  <Rect
                    x={0}
                    y={zone.y}
                    width={GRAPH_WIDTH}
                    height={1}
                    color={chartColors.withOpacity(zone.color, 0.3)}
                  />
                </Group>
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
                  color={chartColors.withOpacity(chartColors.ui.accent, 0.15)}
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
                  color={chartColors.ui.accent}
                >
                  <Shadow
                    dx={0}
                    dy={2}
                    blur={4}
                    color={chartColors.withOpacity(chartColors.ui.accent, 0.3)}
                  />
                </Path>
              )}
            </Group>

            {/* Data points - show every other point for clarity */}
            {/* Removed individual dots as they don't make sense for daily averages */}
          </Canvas>
        </View>

        <ChartFooter
          legendItems={[
            { type: 'line', color: chartColors.ui.accent, label: 'Daily Average' },
            { type: 'area', color: chartColors.performance.excellent, label: 'Excellent Zone' },
            { type: 'area', color: chartColors.performance.good, label: 'Good Zone' },
            { type: 'area', color: chartColors.performance.moderate, label: 'Fair Zone' },
            { type: 'area', color: chartColors.performance.poor, label: 'Needs Work' },
          ]}
          timeRange="Last 30 days"
        />
      </View>
    </BaseCard>
  );
});

EfficiencyChart.displayName = 'EfficiencyChart';

const styles = StyleSheet.create({
  efficiencyCard: {},
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
