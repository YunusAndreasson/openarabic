import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Group, vec, Shadow, Rect, Circle } from '@shopify/react-native-skia';

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
  emoji: string;
}

export const DifficultyChart = memo(({ studyWords = [], onInfoPress }: DifficultyChartProps) => {
  const colors = useColors();

  // Create theme-aware difficulty colors
  const difficultyColors = useMemo(() => {
    return {
      easy: colors.success, // Green
      medium: colors.warning, // Orange
      hard: colors.error, // Red
    };
  }, [colors]);

  // Calculate difficulty distribution
  const difficultyData = useMemo(() => {
    if (studyWords.length === 0) {
      return {
        buckets: [],
        hasData: false,
        insights: { averageDifficulty: 0, hardWords: 0, distribution: 'balanced' as const },
      };
    }

    // Define difficulty buckets with 3 clear categories
    const buckets: DifficultyBucket[] = [
      {
        range: '0.0-0.5',
        count: 0,
        percentage: 0,
        color: difficultyColors.easy,
        label: 'Easy',
        emoji: '😊',
      },
      {
        range: '0.5-0.7',
        count: 0,
        percentage: 0,
        color: difficultyColors.medium,
        label: 'Medium',
        emoji: '😐',
      },
      {
        range: '0.7-1.0',
        count: 0,
        percentage: 0,
        color: difficultyColors.hard,
        label: 'Hard',
        emoji: '😰',
      },
    ];

    let totalDifficulty = 0;
    let hardWords = 0;

    studyWords.forEach(word => {
      const difficulty = word.fsrs_difficulty ?? 0.3;
      totalDifficulty += difficulty;

      if (difficulty >= 0.7) {
        hardWords++;
      }

      // Categorize into 3 buckets
      if (difficulty < 0.5) {
        buckets[0]!.count++;
      } else if (difficulty < 0.7) {
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
    const mediumWords = buckets[1]?.count ?? 0;
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
  }, [studyWords, difficultyColors]);

  // Generate subtitle based on difficulty distribution
  const subtitle = useMemo(() => {
    const { distribution, hardWords, averageDifficulty } = difficultyData.insights;

    if (!difficultyData.hasData) {
      return 'Color-coded difficulty levels from green (easy) to red (hard)';
    }

    if (distribution === 'easy') {
      return `Mostly easy words (avg: ${averageDifficulty.toFixed(1)}) - ready for harder content? 📚`;
    }
    if (distribution === 'challenging') {
      return `${hardWords} challenging words (avg: ${averageDifficulty.toFixed(1)}) - focus on review 💪`;
    }
    return `Balanced difficulty (avg: ${averageDifficulty.toFixed(1)}) - great progress! 🎯`;
  }, [difficultyData.insights, difficultyData.hasData]);

  if (!difficultyData.hasData) {
    return (
      <BaseCard style={styles.difficultyCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.difficultyContent}>
          <CardHeader
            title="Difficulty Distribution"
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
        <CardHeader title="Difficulty Distribution" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: difficultyData.insights.averageDifficulty.toFixed(2),
            label: 'avg difficulty',
            color:
              difficultyData.insights.averageDifficulty > 0.7
                ? colors.error
                : difficultyData.insights.averageDifficulty > 0.5
                  ? colors.warning
                  : colors.success,
          }}
          rightStat={{
            value: difficultyData.insights.hardWords,
            label: 'challenging words',
            color: difficultyData.insights.hardWords > 10 ? colors.error : colors.textSecondary,
          }}
        />

        {/* Enhanced Difficulty Distribution Chart */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
            {/* Clean background */}
            <Group>
              <Rect
                x={0}
                y={0}
                width={GRAPH_WIDTH}
                height={GRAPH_HEIGHT_LARGE}
                color={withOpacity(colors.background, 0.5)}
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

            {/* Clean difficulty bars */}
            <Group>
              {difficultyData.buckets.map((bucket, index) => {
                const barWidth = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.8;
                const barSpacing = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.2;
                const x = index * (barWidth + barSpacing) + barSpacing / 2;
                const maxPercentage = Math.max(...difficultyData.buckets.map(b => b.percentage));
                const barHeight =
                  (bucket.percentage / Math.max(maxPercentage, 1)) * GRAPH_HEIGHT_LARGE;

                // Always show a minimal bar for visual consistency
                const minBarHeight = bucket.count > 0 ? Math.max(barHeight, 4) : 0;

                return (
                  <Group key={`difficulty-bar-${index}`}>
                    {/* Bar shadow for depth */}
                    {minBarHeight > 0 && (
                      <Rect
                        x={x + 1}
                        y={GRAPH_HEIGHT_LARGE - minBarHeight + 1}
                        width={barWidth}
                        height={minBarHeight}
                        color={withOpacity(colors.textSecondary || colors.text, 0.08)}
                      />
                    )}

                    {/* Main bar with better styling */}
                    {minBarHeight > 0 && (
                      <Rect
                        x={x}
                        y={GRAPH_HEIGHT_LARGE - minBarHeight}
                        width={barWidth}
                        height={minBarHeight}
                        color={bucket.color}
                      >
                        <Shadow dx={0} dy={1} blur={2} color={withOpacity(bucket.color, 0.3)} />
                      </Rect>
                    )}

                    {/* Subtle highlight for better visual appeal */}
                    {minBarHeight > 0 && (
                      <Rect
                        x={x}
                        y={GRAPH_HEIGHT_LARGE - minBarHeight}
                        width={barWidth * 0.4}
                        height={minBarHeight}
                        color={withOpacity(colors.background, 0.2)}
                      />
                    )}

                    {/* Count indicator for non-zero values */}
                    {bucket.count > 0 && minBarHeight > 8 && (
                      <Circle
                        cx={x + barWidth / 2}
                        cy={GRAPH_HEIGHT_LARGE - minBarHeight - 6}
                        r={2}
                        color={bucket.color}
                      >
                        <Shadow dx={0} dy={1} blur={1} color={withOpacity(bucket.color, 0.4)} />
                      </Circle>
                    )}
                  </Group>
                );
              })}
            </Group>
          </Canvas>
        </View>

        <ChartFooter
          legendItems={difficultyData.buckets.map(bucket => ({
            type: 'bar' as const,
            color: bucket.color,
            label: bucket.label,
          }))}
          timeRange="Easy → Hard"
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
});
