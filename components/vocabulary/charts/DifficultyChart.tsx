import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Shadow, Rect } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { useChartColors } from '../shared/chartColors';

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
  emoji: string;
}

export const DifficultyChart = memo(({ studyWords = [], onInfoPress }: DifficultyChartProps) => {
  const colors = useColors();
  const chartColors = useChartColors();

  // Calculate difficulty distribution
  const difficultyData = useMemo(() => {
    if (studyWords.length === 0) {
      return {
        buckets: [],
        hasData: false,
        insights: { averageDifficulty: 0, hardWords: 0, distribution: 'balanced' as const },
      };
    }

    // Define difficulty buckets with FSRS-aligned thresholds (FSRS difficulty ranges ~5-10)
    const buckets: DifficultyBucket[] = [
      {
        range: '< 6.5',
        count: 0,
        percentage: 0,
        color: chartColors.difficulty.easy,
        label: 'Easy',
        emoji: '',
      },
      {
        range: '6.5-8.0',
        count: 0,
        percentage: 0,
        color: chartColors.difficulty.medium,
        label: 'Medium',
        emoji: '',
      },
      {
        range: '> 8.0',
        count: 0,
        percentage: 0,
        color: chartColors.difficulty.hard,
        label: 'Hard',
        emoji: '',
      },
    ];

    let totalDifficulty = 0;
    let hardWords = 0;

    studyWords.forEach(word => {
      const difficulty = word.fsrs_difficulty ?? 5.0; // Default to middle range
      totalDifficulty += difficulty;

      if (difficulty >= 8.0) {
        hardWords++;
      }

      // Categorize into 3 buckets with proper FSRS thresholds
      if (difficulty < 6.5) {
        buckets[0]!.count++;
      } else if (difficulty < 8.0) {
        buckets[1]!.count++;
      } else {
        buckets[2]!.count++;
      }
    });

    // Calculate percentages
    buckets.forEach(bucket => {
      bucket.percentage = (bucket.count / studyWords.length) * 100;
    });

    const averageDifficulty = totalDifficulty / studyWords.length;

    // Determine distribution type
    const easyWords = buckets[0]?.count ?? 0;
    const hardWordsCount = buckets[2]?.count ?? 0;

    let distribution: 'easy' | 'balanced' | 'challenging';
    if (easyWords > studyWords.length * 0.6) {
      distribution = 'easy';
    } else if (hardWordsCount > studyWords.length * 0.4) {
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
  }, [studyWords, chartColors]);

  // Generate subtitle based on difficulty distribution
  const subtitle = useMemo(() => {
    if (!difficultyData.hasData) {
      return 'Track word difficulty levels';
    }

    const { distribution } = difficultyData.insights;

    if (distribution === 'easy') {
      return 'Mostly easy - try harder content';
    }
    if (distribution === 'challenging') {
      return 'Many hard words - focus on review';
    }
    return 'Balanced difficulty spread';
  }, [difficultyData.insights, difficultyData.hasData]);

  if (!difficultyData.hasData) {
    return (
      <BaseCard style={styles.difficultyCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.difficultyContent}>
          <CardHeader title="Difficulty" subtitle={subtitle} onInfoPress={onInfoPress} />
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
            value: difficultyData.insights.averageDifficulty.toFixed(1),
            label: 'average',
            color: chartColors.getDifficultyColor(difficultyData.insights.averageDifficulty),
          }}
          rightStat={{
            value: difficultyData.insights.hardWords,
            label: 'hard',
            color:
              difficultyData.insights.hardWords > 10
                ? chartColors.difficulty.hard
                : colors.textSecondary,
          }}
        />

        {/* Enhanced Difficulty Distribution Chart */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Difficulty bars */}
            <Group>
              {difficultyData.buckets.map((bucket, index) => {
                const barWidth = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.8;
                const barSpacing = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.2;
                const x = index * (GRAPH_WIDTH / difficultyData.buckets.length) + barSpacing / 2;
                const barHeight = Math.max(
                  4,
                  (bucket.percentage / 100) * (GRAPH_HEIGHT_LARGE - 20)
                );

                return (
                  <Group key={`difficulty-bar-${index}`}>
                    {/* Main bar with enhanced shadow */}
                    <Rect
                      x={x}
                      y={GRAPH_HEIGHT_LARGE - barHeight - 10}
                      width={barWidth}
                      height={barHeight}
                      color={bucket.color}
                    >
                      <Shadow
                        dx={0}
                        dy={3}
                        blur={6}
                        color={chartColors.withOpacity(bucket.color, 0.4)}
                      />
                    </Rect>

                    {/* Enhanced highlight with gradient effect */}
                    <Rect
                      x={x}
                      y={GRAPH_HEIGHT_LARGE - barHeight - 10}
                      width={barWidth}
                      height={Math.min(barHeight / 3, 8)}
                      color={chartColors.withOpacity(colors.background, 0.25)}
                    />
                  </Group>
                );
              })}
            </Group>
          </Canvas>
        </View>

        {/* Remove redundant legend - chart is self-evident */}
      </View>
    </BaseCard>
  );
});

DifficultyChart.displayName = 'DifficultyChart';

const styles = StyleSheet.create({
  difficultyCard: {},
  difficultyContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  difficultyBreakdown: {
    flexDirection: 'row',
    marginTop: LAYOUT.SPACING.SMALL,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  breakdownText: {
    flexDirection: 'column',
  },
  breakdownLabel: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  breakdownValue: {
    fontWeight: 'bold',
  },
});
