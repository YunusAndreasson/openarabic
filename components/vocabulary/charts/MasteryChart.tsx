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
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, DAYS_30 } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { generateDateRange, isSameDay, getWordState } from '../shared/utils';

interface MasteryChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const MasteryChart = memo(({ studyWords = [], onInfoPress }: MasteryChartProps) => {
  const colors = useColors();

  // Calculate mastery progression over the last 30 days
  const masteryData = useMemo(() => {
    const dates = generateDateRange(DAYS_30);

    return dates.map(date => {
      let masteredCount = 0;
      let totalCount = 0;

      studyWords.forEach(word => {
        const createdAt = new Date(word.created_at);

        // Only count words that existed by this date
        if (createdAt <= date) {
          totalCount++;

          // Check if word was mastered by this date
          const wordState = getWordState(word);
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          if (wordState === 'mastered' && lastReview && lastReview <= date) {
            masteredCount++;
          }
        }
      });

      const masteryRate = totalCount > 0 ? (masteredCount / totalCount) * 100 : 0;
      return { date, masteredCount, totalCount, masteryRate };
    });
  }, [studyWords]);

  // Calculate chart data and insights
  const chartData = useMemo(() => {
    if (masteryData.length === 0) {
      return {
        masteryPath: '',
        hasData: false,
        insights: { currentRate: 0, trend: 'stable' as const, totalMastered: 0 },
      };
    }

    const hasData = masteryData.some(d => d.totalCount > 0);

    if (!hasData) {
      return {
        masteryPath: '',
        hasData: false,
        insights: { currentRate: 0, trend: 'stable' as const, totalMastered: 0 },
      };
    }

    const maxRate = Math.max(1, Math.max(...masteryData.map(d => d.masteryRate)));
    const stepX = GRAPH_WIDTH / (masteryData.length - 1);
    let masteryPath = '';

    masteryData.forEach((data, index) => {
      const x = index * stepX;
      const y = GRAPH_HEIGHT_LARGE - (data.masteryRate / maxRate) * GRAPH_HEIGHT_LARGE;

      if (index === 0) {
        masteryPath = `M ${x} ${y}`;
      } else {
        masteryPath += ` L ${x} ${y}`;
      }
    });

    // Calculate insights
    const recent = masteryData.slice(-7);
    const older = masteryData.slice(-14, -7);

    const currentRate = recent[recent.length - 1]?.masteryRate || 0;
    const recentAvg = recent.reduce((sum, day) => sum + day.masteryRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, day) => sum + day.masteryRate, 0) / older.length;

    const change = recentAvg - olderAvg;
    const trend = change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';
    const totalMastered = recent[recent.length - 1]?.masteredCount || 0;

    return {
      masteryPath,
      hasData,
      maxRate,
      insights: {
        currentRate: Math.round(currentRate * 10) / 10,
        trend,
        totalMastered,
      },
    };
  }, [masteryData]);

  // Generate subtitle based on mastery trend
  const subtitle = useMemo(() => {
    const { currentRate, trend } = chartData.insights;

    if (currentRate === 0) {
      return 'Start reviewing to build mastery';
    }
    if (trend === 'improving') {
      return 'Mastery rate is improving!';
    }
    if (trend === 'declining') {
      return 'Focus on reviewing learned words';
    }
    if (currentRate >= 70) {
      return 'Excellent mastery rate';
    }
    if (currentRate >= 50) {
      return 'Good mastery progress';
    }
    return 'Building vocabulary foundation';
  }, [chartData.insights]);

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.masteryCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.masteryContent}>
          <CardHeader
            title="Mastery"
            subtitle="Track your vocabulary mastery progression"
            onInfoPress={onInfoPress}
          />
        </View>
      </BaseCard>
    );
  }

  return (
    <BaseCard style={styles.masteryCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.masteryContent}>
        <CardHeader title="Mastery" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: `${chartData.insights.currentRate}%`,
            label: 'mastery rate',
            color: colors.success,
          }}
          rightStat={{
            value: chartData.insights.totalMastered,
            label: 'mastered',
          }}
        />

        {/* Mastery Graph */}
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

            {/* Mastery area fill */}
            <Group>
              <Path
                path={`${chartData.masteryPath} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_LARGE} L 0 ${GRAPH_HEIGHT_LARGE} Z`}
                color={withOpacity(colors.success, 0.15)}
              />
            </Group>

            {/* Mastery line with glow effect */}
            <Group>
              <Path
                path={chartData.masteryPath}
                style="stroke"
                strokeWidth={6}
                color={withOpacity(colors.success, 0.3)}
              />
              <Path
                path={chartData.masteryPath}
                style="stroke"
                strokeWidth={3}
                color={colors.success}
              />
            </Group>

            {/* Mastery points */}
            <Group>
              {masteryData.map((data, index) => {
                if (data.masteryRate > 0) {
                  const x = (index * GRAPH_WIDTH) / (masteryData.length - 1);
                  const y =
                    GRAPH_HEIGHT_LARGE -
                    (data.masteryRate / chartData.maxRate!) * GRAPH_HEIGHT_LARGE;
                  return (
                    <Group key={`mastery-point-${index}`}>
                      <Circle cx={x} cy={y} r={5} color={withOpacity(colors.success, 0.3)} />
                      <Circle cx={x} cy={y} r={3} color={colors.success} />
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
          legendItems={[{ type: 'area', color: colors.success, label: 'Mastery rate' }]}
          timeRange="Last 30 days"
        />
      </View>
    </BaseCard>
  );
});

MasteryChart.displayName = 'MasteryChart';

const styles = StyleSheet.create({
  masteryCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  masteryContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
});
