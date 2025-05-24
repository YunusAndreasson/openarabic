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
  EFFICIENCY_THRESHOLD,
} from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { generateDateRange, isSameDay, calculateEfficiencyScore } from '../shared/utils';

interface EfficiencyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const EfficiencyChart = memo(({ studyWords = [], onInfoPress }: EfficiencyChartProps) => {
  const colors = useColors();

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

    // Define performance zones
    const performanceZones = [
      {
        name: 'Excellent',
        min: 80,
        max: 100,
        color: '#22C55E', // Clear bright green
        y: GRAPH_HEIGHT_LARGE - (80 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (20 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'Good',
        min: EFFICIENCY_THRESHOLD,
        max: 80,
        color: colors.info,
        y: GRAPH_HEIGHT_LARGE - (80 / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: ((80 - EFFICIENCY_THRESHOLD) / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      },
      {
        name: 'Needs Improvement',
        min: 0,
        max: EFFICIENCY_THRESHOLD,
        color: '#EF4444', // Clear bright red
        y: GRAPH_HEIGHT_LARGE - (EFFICIENCY_THRESHOLD / maxEfficiency) * GRAPH_HEIGHT_LARGE,
        height: (EFFICIENCY_THRESHOLD / maxEfficiency) * GRAPH_HEIGHT_LARGE,
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
  }, [efficiencyData, colors]);

  // Generate subtitle based on efficiency trend
  const subtitle = useMemo(() => {
    const { currentEfficiency, trend } = chartData.insights;

    if (currentEfficiency === 0) {
      return 'Complete reviews to track efficiency';
    }
    if (trend === 'improving') {
      return 'Learning efficiency is improving! 📈';
    }
    if (trend === 'declining') {
      return 'Consider adjusting study methods 🔄';
    }
    if (currentEfficiency >= 80) {
      return 'Excellent learning efficiency! 🎯';
    }
    if (currentEfficiency >= EFFICIENCY_THRESHOLD) {
      return 'Good learning efficiency 👍';
    }
    return 'Room for efficiency improvement 💡';
  }, [chartData.insights]);

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.efficiencyCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.efficiencyContent}>
          <CardHeader
            title="Learning Efficiency"
            subtitle="Track your learning efficiency over time"
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
            color:
              chartData.insights.currentEfficiency >= 80
                ? '#22C55E' // Clear green for excellent
                : chartData.insights.currentEfficiency >= EFFICIENCY_THRESHOLD
                  ? colors.info
                  : '#EF4444', // Clear red for needs improvement
          }}
          rightStat={{
            value: `${chartData.insights.weeklyAverage}%`,
            label: 'weekly average',
          }}
        />

        {/* Enhanced Efficiency Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Performance zones background */}
            <Group>
              {/* Good performance zone (70%+) */}
              <Rect
                x={0}
                y={0}
                width={GRAPH_WIDTH}
                height={
                  GRAPH_HEIGHT_LARGE -
                  (EFFICIENCY_THRESHOLD / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE
                }
                color={withOpacity('#22C55E', 0.08)}
              />
              {/* Needs improvement zone */}
              <Rect
                x={0}
                y={
                  GRAPH_HEIGHT_LARGE -
                  (EFFICIENCY_THRESHOLD / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE
                }
                width={GRAPH_WIDTH}
                height={(EFFICIENCY_THRESHOLD / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE}
                color={withOpacity('#EF4444', 0.08)}
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

            {/* Efficiency threshold line */}
            <Group>
              <Path
                path={`M 0 ${GRAPH_HEIGHT_LARGE - (EFFICIENCY_THRESHOLD / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE - (EFFICIENCY_THRESHOLD / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE}`}
                style="stroke"
                strokeWidth={2}
                color="#F97316" // Distinct orange for goal line
              />
            </Group>

            {/* Clean area fill */}
            <Group>
              <Path
                path={`${chartData.smoothPath} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE} L 0 ${GRAPH_HEIGHT_LARGE} Z`}
                color={withOpacity(colors.info, 0.15)}
              />
            </Group>

            {/* Main efficiency line */}
            <Group>
              <Path path={chartData.smoothPath} style="stroke" strokeWidth={3} color={colors.info}>
                <Shadow dx={0} dy={1} blur={3} color={withOpacity(colors.info, 0.25)} />
              </Path>
            </Group>

            {/* Performance indicators - only show significant points */}
            <Group>
              {efficiencyData.map((data, index) => {
                if (data.wordCount > 0 && index % 5 === 0) {
                  // Show every 5th point
                  const x = (index * GRAPH_WIDTH) / (efficiencyData.length - 1);
                  const y =
                    GRAPH_HEIGHT_LARGE -
                    (data.averageEfficiency / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE;

                  // Color based on performance
                  const pointColor =
                    data.averageEfficiency >= EFFICIENCY_THRESHOLD
                      ? '#22C55E' // Clear green for good performance
                      : '#EF4444'; // Clear red for needs improvement

                  return (
                    <Group key={`efficiency-point-${index}`}>
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
            { type: 'area', color: colors.info, label: 'Your progress' },
            { type: 'line', color: '#F97316', label: `${EFFICIENCY_THRESHOLD}% goal` },
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
