import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInUp,
  runOnJS,
} from 'react-native-reanimated';
import { Canvas, Group, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

import { useColors } from '@/hooks/useColors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';
import { LAYOUT } from '@/constants/layout';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ThemedText } from '../../ThemedText';
import { GRAPH_WIDTH, GRAPH_HEIGHT_LARGE, CHART_LAYOUT } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { useChartColors } from '../shared/chartColors';

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

    // Simplified animation values for bars
    const chartOpacity = useSharedValue(0);

    // Calculate difficulty distribution
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

      // Define difficulty buckets with FSRS-aligned thresholds
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
          label: 'Hard',
          category: 'difficultyHard',
        },
      ];

      let totalDifficulty = 0;
      let hardWords = 0;

      studyWords.forEach(word => {
        const difficulty = word.fsrs_difficulty ?? 5.0;
        totalDifficulty += difficulty;

        if (difficulty >= 8.0) {
          hardWords++;
        }

        // Categorize into buckets
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

      // Determine distribution type for subtitle
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

      // Find dominant difficulty level
      const dominantLevel = buckets.reduce((prev, current) =>
        current.count > prev.count ? current : prev
      );

      return {
        buckets,
        hasData: true,
        insights: {
          averageDifficulty: Math.round(averageDifficulty * 100) / 100,
          hardWords,
          distribution,
          dominantLevel,
        },
      };
    }, [studyWords, chartColors]);

    // Generate subtitle based on difficulty distribution
    const subtitle = useMemo(() => {
      if (!difficultyData.hasData) {
        return 'Track word difficulty levels';
      }

      const { distribution, averageDifficulty, hardWords } = difficultyData.insights;
      const totalWords = studyWords.length;
      const hardPercentage = totalWords > 0 ? (hardWords / totalWords) * 100 : 0;

      if (distribution === 'easy') {
        return `${Math.round(hardPercentage)}% hard words - consider challenging content`;
      }
      if (distribution === 'challenging') {
        return `${Math.round(hardPercentage)}% hard words - focus on review`;
      }

      // For balanced distribution, provide more nuanced feedback
      if (averageDifficulty < 6.0) {
        return 'Mostly manageable - ready for harder material';
      } else if (averageDifficulty > 8.5) {
        return 'High difficulty - prioritize review sessions';
      } else {
        return 'Well-balanced difficulty spread';
      }
    }, [difficultyData.insights, difficultyData.hasData, studyWords.length]);

    // Simplified animations
    useEffect(() => {
      if (difficultyData.hasData) {
        // Fade in the chart
        chartOpacity.value = withTiming(1, { duration: 400 });
      }
    }, [difficultyData.hasData]);

    // Animated styles for chart
    const chartAnimatedStyle = useAnimatedStyle(() => ({
      opacity: chartOpacity.value,
    }));

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

    if (!difficultyData.hasData) {
      return (
        <BaseCard shadowSize="small" includePressAnimation={false}>
          <View style={styles.difficultyContent}>
            {!hideTitle && (
              <CardHeader title="Difficulty" subtitle={subtitle} onInfoPress={onInfoPress} />
            )}
            <View style={styles.emptyState}>
              <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
                Study some words to see difficulty distribution
              </ThemedText>
            </View>
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard shadowSize="small" includePressAnimation={false}>
        <Animated.View style={[styles.difficultyContent, chartAnimatedStyle]}>
          {!hideTitle && (
            <Animated.View entering={FadeInUp.delay(100).duration(400)}>
              <CardHeader title="Difficulty" subtitle={subtitle} onInfoPress={onInfoPress} />
            </Animated.View>
          )}

          {/* Stats Row - Tightly coupled with chart for visual hierarchy */}
          <Animated.View style={styles.statsSection} entering={FadeInUp.delay(200).duration(400)}>
            <StatsRow
              leftStat={{
                value: difficultyData.insights.dominantLevel?.label ?? 'Balanced',
                label: difficultyData.insights.dominantLevel
                  ? `${Math.round(difficultyData.insights.dominantLevel.percentage)}% dominant`
                  : 'distribution',
                color: difficultyData.insights.dominantLevel?.color ?? colors.secondaryText,
              }}
              rightStat={{
                value: studyWords.length,
                label: 'total words',
                color: colors.secondaryText,
                onPress:
                  onStatPress && studyWords.length > 0 ? () => onStatPress('total') : undefined,
              }}
            />
          </Animated.View>

          {/* Chart Container - Optimized for visual grouping */}
          <Animated.View style={styles.chartSection} entering={FadeInUp.delay(300).duration(500)}>
            {/* Main Chart Canvas */}
            <View style={styles.graphContainer}>
              <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_LARGE }}>
                <Group>
                  {difficultyData.buckets.map((bucket, index) => {
                    const barWidth = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.75; // Slightly wider bars
                    const barSpacing = (GRAPH_WIDTH / difficultyData.buckets.length) * 0.25;
                    const x =
                      index * (GRAPH_WIDTH / difficultyData.buckets.length) + barSpacing / 2;

                    // Optimized bar height calculation with better proportions
                    const maxBarHeight = GRAPH_HEIGHT_LARGE - 24; // More breathing room
                    const barHeight = Math.max((bucket.percentage / 100) * maxBarHeight, 2); // Minimum height for visibility
                    const barY = GRAPH_HEIGHT_LARGE - barHeight - 12; // Better baseline

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
              </Canvas>

              {/* Interactive overlays with optimized touch targets */}
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
                          left: x - 4, // Expanded touch area
                          width: barWidth + 8, // Larger touch target
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
                      accessibilityHint={
                        bucket.count > 0
                          ? 'Tap to view words in this difficulty category'
                          : 'No words in this category'
                      }
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
          </Animated.View>

          {/* Interaction Hint - Separated for clear hierarchy */}
          {onDifficultyPress && difficultyData.buckets.some(b => b.count > 0) && (
            <Animated.View style={styles.hintSection} entering={FadeInUp.delay(500).duration(400)}>
              <ThemedText style={[styles.subtleHintText, { color: colors.secondaryText }]}>
                Tap bars to explore
              </ThemedText>
            </Animated.View>
          )}
        </Animated.View>
      </BaseCard>
    );
  }
);

DifficultyChart.displayName = 'DifficultyChart';

const styles = StyleSheet.create({
  difficultyContent: {
    padding: CHART_LAYOUT.CONTENT_PADDING,
  },
  emptyState: {
    height: GRAPH_HEIGHT_LARGE + 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  graphContainer: {
    height: GRAPH_HEIGHT_LARGE,
    marginBottom: 12, // Tighter coupling with labels
    marginHorizontal: CHART_LAYOUT.GRAPH_MARGIN_HORIZONTAL,
    paddingVertical: CHART_LAYOUT.GRAPH_MARGIN_VERTICAL,
    position: 'relative',
  },
  barTouchArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
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
    alignItems: 'flex-start', // Better alignment
    marginTop: 4, // Closer to chart for proximity
    paddingHorizontal: 8, // Better alignment with bars
  },
  labelItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    minHeight: 36, // Consistent height for visual stability
  },
  labelText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 3, // Tighter spacing for grouping
    letterSpacing: 0.2, // Better readability
  },
  labelCount: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16, // Better vertical rhythm
  },
  subtleHintText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
    letterSpacing: 0.1, // Subtle refinement
  },
  statsSection: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING,
  },
  chartSection: {
    position: 'relative',
  },
  hintSection: {
    marginTop: 12,
    alignItems: 'center',
  },
});
