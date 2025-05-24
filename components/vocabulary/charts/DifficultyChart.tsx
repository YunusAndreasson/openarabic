import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Group } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { ThemedText } from '../../ThemedText';

interface DifficultyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

interface DifficultyBucket {
  range: string;
  count: number;
  percentage: number;
  color: string;
  label: string;
}

export const DifficultyChart = memo(({ studyWords = [], onInfoPress }: DifficultyChartProps) => {
  const colors = useColors();

  // Calculate difficulty distribution
  const difficultyData = useMemo(() => {
    if (studyWords.length === 0) {
      return {
        buckets: [],
        hasData: false,
        insights: { averageDifficulty: 0, hardWords: 0, distribution: 'balanced' as const },
      };
    }

    // Define difficulty buckets
    const buckets: DifficultyBucket[] = [
      { range: '0.0-0.3', count: 0, percentage: 0, color: colors.success, label: 'Very Easy' },
      { range: '0.3-0.5', count: 0, percentage: 0, color: colors.info, label: 'Easy' },
      { range: '0.5-0.7', count: 0, percentage: 0, color: colors.warning, label: 'Medium' },
      { range: '0.7-0.9', count: 0, percentage: 0, color: colors.error, label: 'Hard' },
      { range: '0.9-1.0', count: 0, percentage: 0, color: colors.textTertiary, label: 'Very Hard' },
    ];

    let totalDifficulty = 0;
    let hardWords = 0;

    studyWords.forEach(word => {
      const difficulty = word.fsrs_difficulty ?? 0.3;
      totalDifficulty += difficulty;

      if (difficulty >= 0.7) {
        hardWords++;
      }

      // Categorize into buckets
      if (difficulty < 0.3) {
        buckets[0]!.count++;
      } else if (difficulty < 0.5) {
        buckets[1]!.count++;
      } else if (difficulty < 0.7) {
        buckets[2]!.count++;
      } else if (difficulty < 0.9) {
        buckets[3]!.count++;
      } else {
        buckets[4]!.count++;
      }
    });

    // Calculate percentages
    buckets.forEach(bucket => {
      bucket.percentage = (bucket.count / studyWords.length) * 100;
    });

    const averageDifficulty = totalDifficulty / studyWords.length;

    // Determine distribution type
    const easyWords = (buckets[0]?.count ?? 0) + (buckets[1]?.count ?? 0);
    const mediumWords = buckets[2]?.count ?? 0;
    const hardWordsTotal = (buckets[3]?.count ?? 0) + (buckets[4]?.count ?? 0);

    let distribution: 'easy' | 'balanced' | 'challenging';
    if (easyWords > studyWords.length * 0.6) {
      distribution = 'easy';
    } else if (hardWordsTotal > studyWords.length * 0.4) {
      distribution = 'challenging';
    } else {
      distribution = 'balanced';
    }

    return {
      buckets,
      hasData: true,
      insights: {
        averageDifficulty: Math.round(averageDifficulty * 100) / 100,
        hardWords,
        distribution,
      },
    };
  }, [studyWords, colors]);

  // Generate subtitle based on difficulty distribution
  const subtitle = useMemo(() => {
    const { distribution, hardWords } = difficultyData.insights;

    if (!difficultyData.hasData) {
      return 'Add words to track difficulty patterns';
    }
    if (distribution === 'easy') {
      return 'Mostly easy vocabulary - consider challenging yourself';
    }
    if (distribution === 'challenging') {
      return `${hardWords} hard words - focus on review strategies`;
    }
    return 'Well-balanced difficulty distribution';
  }, [difficultyData.insights, difficultyData.hasData]);

  if (!difficultyData.hasData) {
    return (
      <BaseCard style={styles.difficultyCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.difficultyContent}>
          <CardHeader
            title="Difficulty"
            subtitle="Track your vocabulary challenge levels"
            onInfoPress={onInfoPress}
          />
        </View>
      </BaseCard>
    );
  }

  return (
    <BaseCard style={styles.difficultyCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.difficultyContent}>
        <CardHeader title="Difficulty" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: difficultyData.insights.averageDifficulty.toFixed(2),
            label: 'avg difficulty',
            color: difficultyData.insights.averageDifficulty > 0.7 ? colors.error : colors.success,
          }}
          rightStat={{
            value: difficultyData.insights.hardWords,
            label: 'hard words',
            color: difficultyData.insights.hardWords > 10 ? colors.error : colors.textSecondary,
          }}
        />

        {/* Difficulty Distribution Chart */}
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

            {/* Difficulty bars */}
            <Group>
              {difficultyData.buckets.map((bucket, index) => {
                const barWidth = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.8;
                const barSpacing = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.2;
                const x = index * (barWidth + barSpacing) + barSpacing / 2;
                const maxPercentage = Math.max(...difficultyData.buckets.map(b => b.percentage));
                const barHeight =
                  (bucket.percentage / Math.max(maxPercentage, 1)) * GRAPH_HEIGHT_LARGE;

                if (barHeight > 0) {
                  return (
                    <Group key={`difficulty-bar-${index}`}>
                      {/* Bar shadow */}
                      <Path
                        path={`M ${x + 2} ${GRAPH_HEIGHT_LARGE + 2} L ${x + 2} ${GRAPH_HEIGHT_LARGE - barHeight + 2} L ${x + barWidth + 2} ${GRAPH_HEIGHT_LARGE - barHeight + 2} L ${x + barWidth + 2} ${GRAPH_HEIGHT_LARGE + 2} Z`}
                        color={withOpacity(colors.text, 0.1)}
                      />
                      {/* Main bar */}
                      <Path
                        path={`M ${x} ${GRAPH_HEIGHT_LARGE} L ${x} ${GRAPH_HEIGHT_LARGE - barHeight} L ${x + barWidth} ${GRAPH_HEIGHT_LARGE - barHeight} L ${x + barWidth} ${GRAPH_HEIGHT_LARGE} Z`}
                        color={bucket.color}
                      />
                      {/* Bar highlight */}
                      <Path
                        path={`M ${x} ${GRAPH_HEIGHT_LARGE - barHeight} L ${x + 4} ${GRAPH_HEIGHT_LARGE - barHeight} L ${x + 4} ${GRAPH_HEIGHT_LARGE} L ${x} ${GRAPH_HEIGHT_LARGE} Z`}
                        color={withOpacity(colors.background, 0.3)}
                      />
                    </Group>
                  );
                }
                return null;
              })}
            </Group>
          </Canvas>
        </View>

        {/* Difficulty Legend */}
        <View style={styles.legendContainer}>
          {difficultyData.buckets.map((bucket, index) => (
            <View key={`legend-${index}`} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: bucket.color }]} />
              <View style={styles.legendText}>
                <View style={styles.legendLabel}>
                  <View style={[styles.legendDot, { backgroundColor: bucket.color }]} />
                  <View style={styles.legendInfo}>
                    <View style={styles.legendRow}>
                      <ThemedText type="caption" weight="medium" style={styles.legendTitle}>
                        {bucket.label}
                      </ThemedText>
                      <ThemedText type="caption" weight="bold" style={styles.legendValue}>
                        {bucket.count}
                      </ThemedText>
                    </View>
                    <ThemedText type="caption" variant="secondary" style={styles.legendPercentage}>
                      {bucket.percentage.toFixed(1)}%
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        <ChartFooter
          legendItems={[
            { type: 'bar', color: colors.success, label: 'Easy vocabulary' },
            { type: 'bar', color: colors.error, label: 'Challenging words' },
          ]}
          timeRange="Current distribution"
        />
      </View>
    </BaseCard>
  );
});

DifficultyChart.displayName = 'DifficultyChart';

const styles = StyleSheet.create({
  difficultyCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  difficultyContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  legendContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  legendColor: {
    width: 16,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  legendInfo: {
    flex: 1,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: 'bold',
  },
  legendPercentage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: 0.7,
    marginTop: 2,
  },
});
