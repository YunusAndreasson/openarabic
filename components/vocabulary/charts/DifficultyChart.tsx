import React, { memo, useMemo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Canvas, Group, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

import { useColors } from '@/hooks/useColors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

import { BaseChart, ChartCanvas, type DataPoint } from '../shared';
import { ThemedText } from '../../ThemedText';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, FSRS_DIFFICULTY_THRESHOLDS } from '../shared/constants';
import { useChartColors } from '../shared/chartColors';
import {
  generateChartSubtitle,
  createStandardizedStats,
  CHART_LABELS,
  EMPTY_STATE_MESSAGES,
} from '../shared/chartMessages';

interface DifficultyChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
  onDifficultyPress?: (category: StatCategory) => void;
  onStatPress?: (category: StatCategory) => void;
  hideTitle?: boolean;
}

interface DifficultyBucket {
  count: number;
  percentage: number;
  color: string;
  label: string;
  category: StatCategory;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const DifficultyChart = memo(
  ({
    studyWords = [],
    onInfoPress,
    onDifficultyPress,
    onStatPress,
    hideTitle = false,
  }: DifficultyChartProps) => {
    const colors = useColors();
    const chartColors = useChartColors();

    // Calculate difficulty distribution data with standardized categories
    const difficultyData = useMemo(() => {
      if (studyWords.length === 0) {
        return {
          buckets: [],
          hasData: false,
          insights: {
            averageDifficulty: 0,
            hardWords: 0,
            distribution: 'balanced' as const,
            dominantLevel: null,
          },
        };
      }

      // Create buckets with standardized labels - using "struggling" consistently
      const buckets: DifficultyBucket[] = [
        {
          count: 0,
          percentage: 0,
          color: chartColors.difficulty.easy,
          label: 'Easy',
          category: 'difficultyEasy',
        },
        {
          count: 0,
          percentage: 0,
          color: chartColors.difficulty.medium,
          label: 'Medium',
          category: 'difficultyMedium',
        },
        {
          count: 0,
          percentage: 0,
          color: chartColors.difficulty.hard,
          label: 'Struggling',
          category: 'needsAttention',
        },
      ];

      let totalDifficulty = 0;
      let hardWords = 0;

      // Categorize words using standardized thresholds
      studyWords.forEach(word => {
        const difficulty = word.difficulty || 0.3; // FSRS initial difficulty
        totalDifficulty += difficulty;

        if (difficulty < FSRS_DIFFICULTY_THRESHOLDS.EASY) {
          buckets[0]!.count++;
        } else if (difficulty < FSRS_DIFFICULTY_THRESHOLDS.MEDIUM) {
          buckets[1]!.count++;
        } else {
          buckets[2]!.count++;
          hardWords++;
        }
      });

      // Calculate percentages
      buckets.forEach(bucket => {
        bucket.percentage = (bucket.count / studyWords.length) * 100;
      });

      const averageDifficulty = totalDifficulty / studyWords.length;

      // Determine distribution type for subtitle
      const easyWords = buckets[0]?.count ?? 0;
      const strugglingWords = buckets[2]?.count ?? 0;

      let distribution: 'easy' | 'balanced' | 'challenging';
      if (easyWords > studyWords.length * 0.6) {
        distribution = 'easy';
      } else if (strugglingWords > studyWords.length * 0.4) {
        distribution = 'challenging';
      } else {
        distribution = 'balanced';
      }

      // Find dominant difficulty level
      const dominantLevel = buckets.reduce((prev, current) =>
        current.count > prev.count ? current : prev
      );

      return {
        buckets,
        hasData: true,
        insights: {
          averageDifficulty, // Keep raw value for accurate percentage calculation
          hardWords: strugglingWords,
          distribution,
          dominantLevel,
        },
      };
    }, [studyWords, chartColors]);

    // Generate subtitle using standardized messaging system
    const subtitle = useMemo(() => {
      if (!difficultyData.hasData) {
        return 'Track word difficulty levels';
      }

      const { hardWords } = difficultyData.insights;
      const totalWords = studyWords.length;
      const strugglingPercentage = totalWords > 0 ? (hardWords / totalWords) * 100 : 0;

      // Use standardized subtitle generator
      return generateChartSubtitle.difficulty(
        strugglingPercentage,
        difficultyData.insights.distribution
      );
    }, [difficultyData.insights, difficultyData.hasData, studyWords.length]);

    // Handle bar press with haptic feedback - memoized for performance
    const handleBarPress = useCallback(
      (category: StatCategory, count: number) => {
        if (count > 0 && onDifficultyPress) {
          runOnJS(lightFeedback)();
          onDifficultyPress(category);
        }
      },
      [onDifficultyPress]
    );

    // Prepare data points for interactive tooltips
    const dataPoints: DataPoint[] = useMemo(() => {
      if (!difficultyData.hasData) return [];

      return difficultyData.buckets.map((bucket, index) => {
        const barWidth = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.75;
        const barSpacing = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.25;
        const x = index * (GRAPH_WIDTH / difficultyData.buckets.length) + barSpacing / 2;

        // Calculate bar center for tooltip positioning
        const centerX = x + barWidth / 2;
        const maxBarHeight = GRAPH_HEIGHT_LARGE - 24;
        const barHeight = Math.max((bucket.percentage / 100) * maxBarHeight, 2);
        const barY = GRAPH_HEIGHT_LARGE - barHeight - 12;
        const centerY = barY + barHeight / 2;

        return {
          x: centerX,
          y: centerY,
          value: `${Math.round(bucket.percentage)}%`,
          label: `${bucket.label} (${bucket.count} words)`,
          data: bucket,
        };
      });
    }, [difficultyData]);

    // Create standardized stats using new messaging system with semantic matching
    const { leftStat, rightStat } = useMemo(() => {
      if (!difficultyData.hasData) {
        return createStandardizedStats.difficulty(
          0,
          0,
          colors.secondaryText,
          colors.secondaryText,
          onStatPress
        );
      }

      const { averageDifficulty, hardWords } = difficultyData.insights;

      // Convert FSRS difficulty (0-1 scale) to percentage and round the final result
      const difficultyPercentage = Math.round(Math.min(100, Math.max(0, averageDifficulty * 100)));

      return createStandardizedStats.difficulty(
        difficultyPercentage,
        hardWords, // struggling words count
        chartColors.getDifficultyColor(averageDifficulty),
        chartColors.difficulty.hard, // Red color for struggling words
        onStatPress
      );
    }, [difficultyData, colors.secondaryText, onStatPress, chartColors]);

    return (
      <BaseChart
        title={CHART_LABELS.DIFFICULTY}
        subtitle={subtitle}
        onInfoPress={onInfoPress}
        hideTitle={hideTitle}
        hasData={difficultyData.hasData}
        leftStat={leftStat}
        rightStat={rightStat}
        contentHeight={GRAPH_HEIGHT_LARGE + 60} // Already includes extra height for custom labels
        emptyStateText={EMPTY_STATE_MESSAGES.difficulty}
      >
        <View>
          {/* Chart Container */}
          <View style={styles.chartContainer}>
            <ChartCanvas
              dataPoints={dataPoints}
              enableTooltips={true}
              width={GRAPH_WIDTH}
              height={GRAPH_HEIGHT_LARGE}
              accessibilityLabel="Difficulty distribution chart showing the percentage of words in each difficulty category"
            >
              {/* Main Chart Canvas */}
              <Group>
                {difficultyData.buckets.map((bucket, index) => {
                  const barWidth = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.75;
                  const barSpacing = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.25;
                  const x = index * (GRAPH_WIDTH / difficultyData.buckets.length) + barSpacing / 2;

                  // Optimized bar height calculation with better proportions
                  const maxBarHeight = GRAPH_HEIGHT_LARGE - 24;
                  const barHeight = Math.max((bucket.percentage / 100) * maxBarHeight, 2);
                  const barY = GRAPH_HEIGHT_LARGE - barHeight - 12;

                  return (
                    <Group key={`difficulty-bar-${index}`}>
                      {/* Enhanced main bar with better visual depth */}
                      <Rect x={x} y={barY} width={barWidth} height={barHeight}>
                        <LinearGradient
                          start={vec(0, 0)}
                          end={vec(0, barHeight)}
                          colors={[
                            chartColors.withOpacity(bucket.color, 0.95),
                            bucket.color,
                            chartColors.withOpacity(bucket.color, 0.8),
                          ]}
                        />
                      </Rect>

                      {/* Refined highlight for better depth perception */}
                      <Rect
                        x={x + 1}
                        y={barY + 1}
                        width={barWidth - 2}
                        height={Math.min(barHeight / 3, 6)}
                        color={chartColors.withOpacity(colors.background, 0.25)}
                      />

                      {/* Subtle interactive indicator for tappable bars */}
                      {bucket.count > 0 && onDifficultyPress && (
                        <Rect
                          x={x}
                          y={barY}
                          width={barWidth}
                          height={barHeight}
                          style="stroke"
                          strokeWidth={1.5}
                          color={chartColors.withOpacity(bucket.color, 0.7)}
                        />
                      )}

                      {/* Subtle shadow for depth */}
                      <Rect
                        x={x + 1}
                        y={barY + barHeight - 1}
                        width={barWidth - 2}
                        height={1}
                        color={chartColors.withOpacity(colors.shadow, 0.15)}
                      />
                    </Group>
                  );
                })}
              </Group>
            </ChartCanvas>

            {/* Interactive overlays with optimized touch targets - positioned within chart container */}
            {onDifficultyPress &&
              difficultyData.buckets.map((bucket, index) => {
                const barWidth = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.75;
                const barSpacing = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.25;
                const x = index * (GRAPH_WIDTH / difficultyData.buckets.length) + barSpacing / 2;

                const pressAnimation = useSharedValue(1);

                const animatedStyle = useAnimatedStyle(() => ({
                  transform: [{ scale: pressAnimation.value }],
                }));

                return (
                  <AnimatedTouchableOpacity
                    key={`difficulty-touch-${index}`}
                    style={[
                      styles.barTouchArea,
                      animatedStyle,
                      {
                        left: x - 4,
                        width: barWidth + 8,
                        backgroundColor: bucket.count > 0 ? colors.buttonOverlay : 'transparent',
                        borderRadius: 6,
                      },
                    ]}
                    onPressIn={() => {
                      if (bucket.count > 0) {
                        pressAnimation.value = withSpring(0.96, { damping: 20, stiffness: 400 });
                      }
                    }}
                    onPressOut={() => {
                      pressAnimation.value = withSpring(1, { damping: 20, stiffness: 400 });
                    }}
                    onPress={() => handleBarPress(bucket.category, bucket.count)}
                    activeOpacity={bucket.count > 0 ? 0.75 : 1}
                    disabled={bucket.count === 0}
                    accessibilityLabel={`${bucket.label} difficulty: ${Math.round(bucket.percentage)}% of words`}
                    accessibilityRole="button"
                  />
                );
              })}
          </View>

          {/* Labels Section - Grouped with chart for proximity */}
          <View style={styles.labelsContainer}>
            {difficultyData.buckets.map((bucket, index) => (
              <View key={`label-${index}`} style={styles.labelItem}>
                <ThemedText style={[styles.labelText, { color: colors.secondaryText }]}>
                  {bucket.label}
                </ThemedText>
                <ThemedText style={[styles.labelCount, { color: colors.text }]}>
                  {bucket.count > 0 ? `${Math.round(bucket.percentage)}%` : '0%'}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Interaction Hint */}
          {onDifficultyPress && difficultyData.buckets.some(b => b.count > 0) && (
            <View style={styles.hintSection}>
              <ThemedText style={[styles.subtleHintText, { color: colors.secondaryText }]}>
                Tap bars to explore words
              </ThemedText>
            </View>
          )}
        </View>
      </BaseChart>
    );
  }
);

DifficultyChart.displayName = 'DifficultyChart';

const styles = StyleSheet.create({
  chartContainer: {
    height: GRAPH_HEIGHT_LARGE,
    width: GRAPH_WIDTH,
    position: 'relative',
    alignSelf: 'center',
  },
  barTouchArea: {
    position: 'absolute',
    top: 0,
    height: GRAPH_HEIGHT_LARGE,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  labelItem: {
    alignItems: 'center',
    flex: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelCount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  hintSection: {
    alignItems: 'center',
    marginTop: 12,
  },
  subtleHintText: {
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
