import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Circle, Group } from '@shopify/react-native-skia';

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
        hasData: false,
        insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
      };
    }

    const hasData = efficiencyData.some(d => d.wordCount > 0);

    if (!hasData) {
      return {
        efficiencyPath: '',
        hasData: false,
        insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
      };
    }

    const maxEfficiency = Math.max(1, Math.max(...efficiencyData.map(d => d.averageEfficiency)));
    const stepX = GRAPH_WIDTH / (efficiencyData.length - 1);
    let efficiencyPath = '';

    efficiencyData.forEach((data, index) => {
      const x = index * stepX;
      const y = GRAPH_HEIGHT_LARGE - (data.averageEfficiency / maxEfficiency) * GRAPH_HEIGHT_LARGE;

      if (index === 0) {
        efficiencyPath = `M ${x} ${y}`;
      } else {
        efficiencyPath += ` L ${x} ${y}`;
      }
    });

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
      efficiencyPath,
      hasData,
      maxEfficiency,
      insights: {
        currentEfficiency: Math.round(currentEfficiency * 10) / 10,
        trend,
        weeklyAverage: Math.round(recentAvg * 10) / 10,
      },
    };
  }, [efficiencyData]);

  // Generate subtitle based on efficiency trend
  const subtitle = useMemo(() => {
    const { currentEfficiency, trend } = chartData.insights;

    if (currentEfficiency === 0) {
      return 'Complete reviews to track efficiency';
    }
    if (trend === 'improving') {
      return 'Learning efficiency is improving!';
    }
    if (trend === 'declining') {
      return 'Consider adjusting study methods';
    }
    if (currentEfficiency >= EFFICIENCY_THRESHOLD) {
      return 'Excellent learning efficiency';
    }
    if (currentEfficiency >= 50) {
      return 'Good learning efficiency';
    }
    return 'Room for efficiency improvement';
  }, [chartData.insights]);

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.efficiencyCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.efficiencyContent}>
          <CardHeader
            title="Efficiency"
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
        <CardHeader title="Efficiency" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: `${chartData.insights.currentEfficiency}%`,
            label: 'current',
            color:
              chartData.insights.currentEfficiency >= EFFICIENCY_THRESHOLD
                ? colors.success
                : colors.warning,
          }}
          rightStat={{
            value: `${chartData.insights.weeklyAverage}%`,
            label: 'weekly avg',
          }}
        />

        {/* Efficiency Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Background grid lines */}
            <Group>
              {[0.25, 0.5, 0.75].map((ratio, index) => (
                <Path
                  key={`grid-line-${index}`}
                  path={`M 0 ${GRAPH_HEIGHT_LARGE * ratio} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE * ratio}`}
                  style="stroke"
                  strokeWidth={0.5}
                  color={withOpacity(colors.text, 0.1)}
                />
              ))}
            </Group>

            {/* Efficiency threshold line */}
            <Group>
              <Path
                path={`M 0 ${GRAPH_HEIGHT_LARGE - (EFFICIENCY_THRESHOLD / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE - (EFFICIENCY_THRESHOLD / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE}`}
                style="stroke"
                strokeWidth={1}
                color={withOpacity(colors.success, 0.5)}
              />
            </Group>

            {/* Efficiency area fill */}
            <Group>
              <Path
                path={`${chartData.efficiencyPath} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE} L 0 ${GRAPH_HEIGHT_LARGE} Z`}
                color={withOpacity(colors.tint, 0.15)}
              />
            </Group>

            {/* Efficiency line with glow effect */}
            <Group>
              <Path
                path={chartData.efficiencyPath}
                style="stroke"
                strokeWidth={6}
                color={withOpacity(colors.tint, 0.3)}
              />
              <Path
                path={chartData.efficiencyPath}
                style="stroke"
                strokeWidth={3}
                color={colors.tint}
              />
            </Group>

            {/* Efficiency points */}
            <Group>
              {efficiencyData.map((data, index) => {
                if (data.wordCount > 0) {
                  const x = (index * GRAPH_WIDTH) / (efficiencyData.length - 1);
                  const y =
                    GRAPH_HEIGHT_LARGE -
                    (data.averageEfficiency / chartData.maxEfficiency!) * GRAPH_HEIGHT_LARGE;
                  const pointColor =
                    data.averageEfficiency >= EFFICIENCY_THRESHOLD ? colors.success : colors.tint;
                  return (
                    <Group key={`efficiency-point-${index}`}>
                      <Circle cx={x} cy={y} r={5} color={withOpacity(pointColor, 0.3)} />
                      <Circle cx={x} cy={y} r={3} color={pointColor} />
                      <Circle cx={x} cy={y} r={1} color={withOpacity(colors.background, 0.8)} />
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
            { type: 'area', color: colors.tint, label: 'Efficiency score' },
            { type: 'line', color: colors.success, label: `${EFFICIENCY_THRESHOLD}% target` },
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
