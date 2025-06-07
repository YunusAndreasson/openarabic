import { Canvas, Path, Circle, Group, Skia, LinearGradient, vec } from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useNavigationWithDebounce } from '@/hooks';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

import { ThemedText } from '../../ThemedText';
import { BaseChart } from '../shared';
import { useChartColors } from '../shared/chartColors';

interface MemoryCapacityGaugeProps {
  studyWords: StudyWord[];
  onStatPress?: (category: StatCategory) => void;
}

// Enhanced gauge configuration for better visual appeal
const GAUGE_WIDTH = 300;
const GAUGE_HEIGHT = 170;
const GAUGE_RADIUS = 130;
const GAUGE_STROKE_WIDTH = 18;
const INDICATOR_SIZE = 10;
const INDICATOR_GLOW_SIZE = 20;

// Memory capacity thresholds with refined ranges
const CAPACITY_THRESHOLDS = {
  OPTIMAL: 75, // Green zone - excellent learning health
  MODERATE: 50, // Yellow zone - good progress
  CRITICAL: 25, // Orange zone - needs attention
} as const;

// Enhanced animation configurations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

export const MemoryCapacityGauge = memo<MemoryCapacityGaugeProps>(({ studyWords = [] }) => {
  const colors = useColors();
  const chartColors = useChartColors();
  const { navigateTo } = useNavigationWithDebounce();

  // Animation values for smooth interactions
  const pressScale = useSharedValue(1);
  const indicatorPulse = useSharedValue(1);

  // Calculate enhanced memory capacity with better algorithm
  const memoryMetrics = useMemo(() => {
    if (!studyWords.length) {
      return { capacityScore: 85, trend: 'stable' as const };
    }

    // Filter words with FSRS data
    const validWords = studyWords.filter(
      word => word.fsrs_stability != null && word.fsrs_difficulty != null
    );

    if (!validWords.length) {
      return { capacityScore: 85, trend: 'stable' as const };
    }

    // Enhanced calculation with FSRS algorithm principles
    const averageStability =
      validWords.reduce((sum, word) => sum + (word.fsrs_stability || 0), 0) / validWords.length;
    const averageDifficulty =
      validWords.reduce((sum, word) => sum + (word.fsrs_difficulty || 5), 0) / validWords.length;
    const averageReps =
      validWords.reduce((sum, word) => sum + (word.fsrs_reps || 0), 0) / validWords.length;

    // More sophisticated scoring algorithm based on available FSRS data
    const stabilityFactor = Math.min(averageStability / 30, 1) * 45; // 0-45 points
    const repsFactor = Math.min(averageReps / 10, 1) * 30; // 0-30 points (more reps = better retention)
    const difficultyFactor = Math.max(0, (10 - averageDifficulty) / 10) * 25; // 0-25 points

    const capacityScore = Math.round(stabilityFactor + repsFactor + difficultyFactor);

    // Determine trend based on recent performance
    const recentWords = validWords.filter(word => {
      if (!word.created_at) return false;
      const wordDate = new Date(word.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return wordDate >= weekAgo;
    });

    const trend = recentWords.length > 0 && averageReps > 2 ? 'improving' : 'stable';

    return {
      capacityScore: Math.max(15, Math.min(100, capacityScore)),
      trend,
    };
  }, [studyWords]);

  // Create enhanced gauge paths with better visual appeal
  const gaugePaths = useMemo(() => {
    const centerX = GAUGE_WIDTH / 2;
    const centerY = GAUGE_HEIGHT - 15;
    const startAngle = 185;
    const totalSweep = 170;

    // Full gauge path (background)
    const fullPath = Skia.Path.Make();
    fullPath.addArc(
      {
        x: centerX - GAUGE_RADIUS,
        y: centerY - GAUGE_RADIUS,
        width: GAUGE_RADIUS * 2,
        height: GAUGE_RADIUS * 2,
      },
      startAngle,
      totalSweep
    );

    // Filled portion path based on capacity score
    const filledSweep = (memoryMetrics.capacityScore / 100) * totalSweep;
    const filledPath = Skia.Path.Make();
    filledPath.addArc(
      {
        x: centerX - GAUGE_RADIUS,
        y: centerY - GAUGE_RADIUS,
        width: GAUGE_RADIUS * 2,
        height: GAUGE_RADIUS * 2,
      },
      startAngle,
      filledSweep
    );

    return { fullPath, filledPath, filledSweep };
  }, [memoryMetrics.capacityScore]);

  // Helper functions for gradient calculation
  const getFilledGradientColors = (capacityScore: number): string[] => {
    const baseColors = [
      chartColors.performance.poor ?? '#FF0000', // fallback Red
      chartColors.performance.moderate ?? '#FFA500', // fallback Orange
      chartColors.performance.good ?? '#0000FF', // fallback Blue
      chartColors.performance.excellent ?? '#00FF00', // fallback Green
    ];

    if (capacityScore <= 30) {
      // Only red to orange transition
      return [baseColors[0] as string, baseColors[1] as string];
    } else if (capacityScore <= 70) {
      // Red to orange to blue transition
      return [baseColors[0] as string, baseColors[1] as string, baseColors[2] as string];
    } else {
      // Full gradient
      return baseColors;
    }
  };

  const getFilledGradientPositions = (capacityScore: number): number[] => {
    if (capacityScore <= 30) {
      // Map 0-30% to full gradient span
      return [0, 1];
    } else if (capacityScore <= 70) {
      // Map 0-70% across three colors
      return [0, 30 / capacityScore, 1];
    } else {
      // Map 0-100% across four colors, scaled to actual score
      return [0, 30 / capacityScore, 70 / capacityScore, 1];
    }
  };

  // Calculate enhanced indicator position with smooth animation potential
  const indicatorPosition = useMemo(() => {
    const centerX = GAUGE_WIDTH / 2;
    const centerY = GAUGE_HEIGHT - 15;

    // Convert capacity score to angle with refined mapping
    const angle = 185 - (memoryMetrics.capacityScore / 100) * 170;
    const angleRad = (angle * Math.PI) / 180;

    const indicatorRadius = GAUGE_RADIUS - GAUGE_STROKE_WIDTH / 2;
    const x = centerX + Math.cos(angleRad) * indicatorRadius;
    const y = centerY + Math.sin(angleRad) * indicatorRadius;

    return { x, y, angle };
  }, [memoryMetrics.capacityScore]);

  // Enhanced color system with better visual hierarchy
  const getCapacityColor = (score: number) => {
    if (score >= CAPACITY_THRESHOLDS.OPTIMAL) return chartColors.performance.excellent;
    if (score >= CAPACITY_THRESHOLDS.MODERATE) return chartColors.performance.good;
    if (score >= CAPACITY_THRESHOLDS.CRITICAL) return chartColors.performance.moderate;
    return chartColors.performance.poor;
  };

  // Clear, user-friendly status text
  const getStatusText = (score: number) => {
    if (score >= CAPACITY_THRESHOLDS.OPTIMAL) return 'Light';
    if (score >= CAPACITY_THRESHOLDS.MODERATE) return 'Balanced';
    if (score >= CAPACITY_THRESHOLDS.CRITICAL) return 'Busy';
    return 'Overloaded';
  };

  // Concise, actionable recommendations
  const getRecommendationMessage = (score: number) => {
    if (score >= CAPACITY_THRESHOLDS.OPTIMAL) {
      return 'Perfect for adding new words';
    }
    if (score >= CAPACITY_THRESHOLDS.MODERATE) {
      return 'Keep up your current pace';
    }
    if (score >= CAPACITY_THRESHOLDS.CRITICAL) {
      return 'Review more, add fewer words';
    }
    return 'Focus on reviews over new words';
  };

  // Enhanced navigation with haptic feedback
  const handleInsightsPress = () => {
    selectionFeedback();

    // Animate press feedback
    pressScale.value = withTiming(0.98, { duration: 100 }, () => {
      pressScale.value = withSpring(1, SPRING_CONFIG);
    });

    navigateTo('/(tabs)/practice/insights' as any);
  };

  // Animated style for press feedback
  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  // Pulse animation for indicator
  React.useEffect(() => {
    const pulse = () => {
      indicatorPulse.value = withTiming(1.2, { duration: 1000 }, () => {
        indicatorPulse.value = withTiming(1, { duration: 1000 });
      });
    };

    const interval = setInterval(pulse, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BaseChart
      contentHeight={GAUGE_HEIGHT + 60}
      emptyStateText="Add words to track your learning load"
      hasData={studyWords.length > 0}
      hideTitle={true}
      subtitle=""
      title=""
      onInfoPress={() => {}}
    >
      {/* Context Pill */}
      <View style={styles.pillContainer}>
        <View style={[styles.pill, { backgroundColor: colors.buttonOverlay }]}>
          <ThemedText style={[styles.pillText, { color: colors.tint }]} type="caption">
            MEMORY LOAD
          </ThemedText>
        </View>
      </View>

      <Animated.View style={animatedPressStyle}>
        <TouchableOpacity
          accessibilityHint="View detailed learning insights"
          accessibilityLabel={`Memory load ${memoryMetrics.capacityScore}%, ${getStatusText(memoryMetrics.capacityScore).toLowerCase()}. Tap for insights`}
          accessibilityRole="button"
          activeOpacity={1}
          style={styles.gaugeContainer}
          onPress={handleInsightsPress}
        >
          <Canvas style={styles.canvas}>
            <Group>
              {/* Background track - full gauge path with low opacity */}
              <Path
                color={chartColors.withOpacity(colors.card, 0.6)}
                path={gaugePaths.fullPath}
                strokeCap="round"
                strokeWidth={GAUGE_STROKE_WIDTH + 2}
                style="stroke"
              />

              <Path
                color={chartColors.withOpacity(chartColors.ui.border, 0.08)}
                path={gaugePaths.fullPath}
                strokeCap="round"
                strokeWidth={GAUGE_STROKE_WIDTH}
                style="stroke"
              />

              {/* Unfilled portion with low opacity gradient */}
              <Path
                opacity={0.2}
                path={gaugePaths.fullPath}
                strokeCap="round"
                strokeWidth={GAUGE_STROKE_WIDTH}
                style="stroke"
              >
                <LinearGradient
                  end={vec(GAUGE_WIDTH * 0.95, GAUGE_HEIGHT / 2)}
                  positions={[0, 0.3, 0.7, 1]}
                  start={vec(GAUGE_WIDTH * 0.05, GAUGE_HEIGHT / 2)}
                  colors={[
                    chartColors.performance.poor, // Red (left)
                    chartColors.performance.moderate, // Orange (left-center)
                    chartColors.performance.good, // Blue (right-center)
                    chartColors.performance.excellent, // Green (right)
                  ]}
                />
              </Path>

              {/* Filled portion - only the achieved capacity with full opacity */}
              <Path
                path={gaugePaths.filledPath}
                strokeCap="round"
                strokeWidth={GAUGE_STROKE_WIDTH}
                style="stroke"
              >
                <LinearGradient
                  colors={getFilledGradientColors(memoryMetrics.capacityScore)}
                  positions={getFilledGradientPositions(memoryMetrics.capacityScore)}
                  start={vec(GAUGE_WIDTH * 0.05, GAUGE_HEIGHT / 2)}
                  end={vec(
                    GAUGE_WIDTH * 0.05 + (GAUGE_WIDTH * 0.9 * gaugePaths.filledSweep) / 170,
                    GAUGE_HEIGHT / 2
                  )}
                />
              </Path>

              {/* Enhanced capacity indicator with glow effect */}
              <Circle
                color={chartColors.withOpacity(getCapacityColor(memoryMetrics.capacityScore), 0.15)}
                cx={indicatorPosition.x}
                cy={indicatorPosition.y}
                r={INDICATOR_GLOW_SIZE}
                style="fill"
              />

              <Circle
                color={colors.background}
                cx={indicatorPosition.x}
                cy={indicatorPosition.y}
                r={INDICATOR_SIZE + 2}
                style="fill"
              />

              <Circle
                color={getCapacityColor(memoryMetrics.capacityScore)}
                cx={indicatorPosition.x}
                cy={indicatorPosition.y}
                r={INDICATOR_SIZE}
                style="fill"
              />

              {/* Inner highlight for 3D effect */}
              <Circle
                color={chartColors.withOpacity(colors.background, 0.4)}
                cx={indicatorPosition.x - 1}
                cy={indicatorPosition.y - 1}
                r={INDICATOR_SIZE - 3}
                style="fill"
              />
            </Group>
          </Canvas>

          {/* Enhanced center section with better typography */}
          <View style={styles.centerSection}>
            <View style={styles.scoreContainer}>
              <ThemedText
                style={[
                  styles.capacityText,
                  { color: getCapacityColor(memoryMetrics.capacityScore) },
                ]}
              >
                {memoryMetrics.capacityScore}%
              </ThemedText>
              <View style={styles.statusContainer}>
                <ThemedText
                  type="caption"
                  style={[
                    styles.statusText,
                    { color: getCapacityColor(memoryMetrics.capacityScore) },
                  ]}
                >
                  {getStatusText(memoryMetrics.capacityScore)}
                </ThemedText>
                {memoryMetrics.trend === 'improving' && (
                  <View
                    style={[
                      styles.trendIndicator,
                      { backgroundColor: chartColors.performance.excellent },
                    ]}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Clear action hint */}
          <View style={styles.tapHintContainer}>
            <ThemedText style={styles.tapHint} type="caption" variant="secondary">
              View insights
            </ThemedText>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Enhanced recommendation section with better spacing */}
      <View style={styles.recommendationContainer}>
        <ThemedText style={styles.recommendationText} type="caption" variant="secondary">
          {getRecommendationMessage(memoryMetrics.capacityScore)}
        </ThemedText>
      </View>
    </BaseChart>
  );
});

MemoryCapacityGauge.displayName = 'MemoryCapacityGauge';

const styles = StyleSheet.create({
  canvas: {
    height: GAUGE_HEIGHT,
    width: GAUGE_WIDTH,
  },
  capacityText: {
    fontSize: 36,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: -1,
    lineHeight: 40,
  },
  centerSection: {
    alignItems: 'center',
    bottom: 30,
    justifyContent: 'center',
    position: 'absolute',
  },
  gaugeContainer: {
    alignItems: 'center',
    height: GAUGE_HEIGHT + 40,
    justifyContent: 'center',
    position: 'relative',
  },
  recommendationContainer: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  recommendationText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    opacity: 0.8,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
    letterSpacing: 0.2,
    opacity: 0.4,
  },
  tapHintContainer: {
    alignItems: 'center',
    bottom: 16,
    position: 'absolute',
  },
  trendIndicator: {
    borderRadius: 3,
    height: 6,
    marginLeft: 6,
    opacity: 0.8,
    width: 6,
  },
  pillContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
