import { Ionicons } from '@expo/vector-icons';
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

import { ThemedText } from '@/components/ThemedText';
import { BaseChart } from '@/components/vocabulary/shared';
import { useChartColors } from '@/components/vocabulary/shared/chartColors';

interface MemoryCapacityGaugeProps {
  studyWords: StudyWord[];
  onStatPress?: (category: StatCategory) => void;
}

// Enhanced gauge configuration for better visual appeal
const GAUGE_WIDTH = 320;
const GAUGE_HEIGHT = 180;
const GAUGE_RADIUS = 140;
const GAUGE_STROKE_WIDTH = 20;
const INDICATOR_SIZE = 12;
const INDICATOR_GLOW_SIZE = 24;

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

  // Clear, actionable readiness messaging
  const getReadinessMessage = (score: number) => {
    if (score >= CAPACITY_THRESHOLDS.OPTIMAL) {
      return 'Add new words';
    }
    if (score >= CAPACITY_THRESHOLDS.MODERATE) {
      return 'Add words moderately';
    }
    if (score >= CAPACITY_THRESHOLDS.CRITICAL) {
      return 'Review before adding';
    }
    return 'Focus on reviews only';
  };

  // Enhanced navigation with haptic feedback
  const handleInsightsPress = () => {
    selectionFeedback();

    // Animate press feedback
    pressScale.value = withTiming(0.98, { duration: 100 }, () => {
      pressScale.value = withSpring(1, SPRING_CONFIG);
    });

    navigateTo('/insights' as any);
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
      contentHeight={GAUGE_HEIGHT + 140}
      emptyStateText="Add words to see your learning capacity"
      hasData={studyWords.length > 0}
      hideTitle={true}
      subtitle=""
      title=""
      onInfoPress={() => {}}
    >
      <Animated.View style={animatedPressStyle}>
        <View style={styles.gaugeContainer}>
          {/* Info button in top right corner */}
          <TouchableOpacity
            accessibilityHint="View detailed learning insights"
            accessibilityLabel="View insights"
            accessibilityRole="button"
            style={styles.infoButton}
            onPress={handleInsightsPress}
          >
            <Ionicons name="analytics-outline" size={20} color={colors.tint} />
          </TouchableOpacity>
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

          {/* Center section with percentage */}
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
              {memoryMetrics.trend === 'improving' && (
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.trendIndicator,
                      { backgroundColor: chartColors.performance.excellent },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bottom section with prominent readiness status */}
        <View style={styles.bottomSection}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: chartColors.withOpacity(
                  memoryMetrics.capacityScore >= CAPACITY_THRESHOLDS.MODERATE
                    ? chartColors.performance.excellent
                    : chartColors.performance.moderate,
                  0.08
                ),
              },
            ]}
          >
            <ThemedText
              style={[
                styles.statusLabel,
                {
                  color:
                    memoryMetrics.capacityScore >= CAPACITY_THRESHOLDS.MODERATE
                      ? chartColors.performance.excellent
                      : chartColors.performance.moderate,
                },
              ]}
              type="caption"
            >
              {memoryMetrics.capacityScore >= CAPACITY_THRESHOLDS.MODERATE
                ? 'READY FOR NEW WORDS'
                : 'NOT READY FOR NEW WORDS'}
            </ThemedText>
          </View>

          <ThemedText style={styles.actionText}>
            {getReadinessMessage(memoryMetrics.capacityScore)}
          </ThemedText>
        </View>
      </Animated.View>
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
    fontSize: 42,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: -1.5,
    lineHeight: 46,
    textAlign: 'center',
  },
  centerSection: {
    alignItems: 'center',
    bottom: 45,
    justifyContent: 'center',
    position: 'absolute',
  },
  gaugeContainer: {
    alignItems: 'center',
    height: GAUGE_HEIGHT + 40,
    justifyContent: 'center',
    position: 'relative',
  },
  infoButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: 20,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    opacity: 1,
    textAlign: 'center',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
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
  readinessText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
    letterSpacing: 0.2,
    opacity: 0.6,
    textAlign: 'center',
  },
  trendIndicator: {
    borderRadius: 3,
    height: 6,
    marginLeft: 6,
    opacity: 0.8,
    width: 6,
  },
});
