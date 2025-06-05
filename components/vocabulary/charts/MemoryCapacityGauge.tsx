import {
  Canvas,
  Path,
  Circle,
  Group,
  Skia,
  LinearGradient,
  vec,
  Text,
  matchFont,
  RadialGradient,
  Shadow,
} from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useNavigationWithDebounce } from '@/hooks';
import { useColors } from '@/hooks/useColors';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

import { ThemedText } from '../../ThemedText';
import { BaseChart } from '../shared';
import { useChartColors } from '../shared/chartColors';
import {
  generateChartSubtitle,
  createStandardizedStats,
  CHART_LABELS,
} from '../shared/chartMessages';

interface MemoryCapacityGaugeProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
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

const TIMING_CONFIG = {
  duration: 800,
};

export const MemoryCapacityGauge = memo<MemoryCapacityGaugeProps>(
  ({ studyWords = [], onInfoPress, onStatPress }) => {
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

    // Create enhanced gauge path with better visual appeal
    const gaugePath = useMemo(() => {
      const path = Skia.Path.Make();
      const centerX = GAUGE_WIDTH / 2;
      const centerY = GAUGE_HEIGHT - 15;

      // Create half circle arc with refined positioning
      path.addArc(
        {
          x: centerX - GAUGE_RADIUS,
          y: centerY - GAUGE_RADIUS,
          width: GAUGE_RADIUS * 2,
          height: GAUGE_RADIUS * 2,
        },
        185, // Start angle (slightly adjusted for better visual)
        170 // Sweep angle (refined arc)
      );

      return path;
    }, []);

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

    // Enhanced status text with more nuanced messaging
    const getStatusText = (score: number) => {
      if (score >= CAPACITY_THRESHOLDS.OPTIMAL) return 'Optimal';
      if (score >= CAPACITY_THRESHOLDS.MODERATE) return 'Good';
      if (score >= CAPACITY_THRESHOLDS.CRITICAL) return 'Moderate';
      return 'Overloaded';
    };

    // Enhanced recommendation with actionable insights
    const getRecommendationMessage = (score: number) => {
      if (score >= CAPACITY_THRESHOLDS.OPTIMAL) {
        return 'Perfect balance! Your memory capacity is optimal for learning new vocabulary.';
      }
      if (score >= CAPACITY_THRESHOLDS.MODERATE) {
        return 'Solid foundation. Continue your review schedule to maintain healthy retention.';
      }
      if (score >= CAPACITY_THRESHOLDS.CRITICAL) {
        return 'Focus on reviewing current words to strengthen your memory foundation.';
      }
      return 'Consider reducing new words and increasing review frequency for better retention.';
    };

    // Enhanced navigation with haptic feedback
    const handleInsightsPress = () => {
      lightFeedback();

      // Animate press feedback
      pressScale.value = withTiming(0.98, { duration: 100 }, () => {
        pressScale.value = withSpring(1, SPRING_CONFIG);
      });

      navigateTo('insights' as any);
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

    const animatedIndicatorStyle = useAnimatedStyle(() => ({
      transform: [{ scale: indicatorPulse.value }],
    }));

    return (
      <BaseChart
        title=""
        subtitle=""
        onInfoPress={onInfoPress}
        hideTitle={true}
        hasData={studyWords.length > 0}
        contentHeight={GAUGE_HEIGHT + 80}
        emptyStateText="Start learning words to track your memory capacity"
      >
        <Animated.View style={animatedPressStyle}>
          <TouchableOpacity
            style={styles.gaugeContainer}
            onPress={handleInsightsPress}
            activeOpacity={1}
            accessibilityLabel={`Memory capacity: ${memoryMetrics.capacityScore}%. Tap to view detailed vocabulary insights`}
            accessibilityRole="button"
            accessibilityHint="Opens insights screen with detailed analytics"
          >
            <Canvas style={styles.canvas}>
              <Group>
                {/* Enhanced background gauge track with subtle gradient */}
                <Path
                  path={gaugePath}
                  style="stroke"
                  strokeWidth={GAUGE_STROKE_WIDTH + 2}
                  strokeCap="round"
                  color={chartColors.withOpacity(colors.card, 0.8)}
                />

                <Path
                  path={gaugePath}
                  style="stroke"
                  strokeWidth={GAUGE_STROKE_WIDTH}
                  strokeCap="round"
                  color={chartColors.withOpacity(chartColors.ui.border, 0.12)}
                />

                {/* Enhanced colored gauge with refined gradient */}
                <Path
                  path={gaugePath}
                  style="stroke"
                  strokeWidth={GAUGE_STROKE_WIDTH}
                  strokeCap="round"
                >
                  <LinearGradient
                    start={vec(GAUGE_WIDTH * 0.05, GAUGE_HEIGHT / 2)}
                    end={vec(GAUGE_WIDTH * 0.95, GAUGE_HEIGHT / 2)}
                    colors={[
                      chartColors.performance.poor, // Red (left)
                      chartColors.performance.moderate, // Orange (left-center)
                      chartColors.performance.good, // Blue (right-center)
                      chartColors.performance.excellent, // Green (right)
                    ]}
                    positions={[0, 0.3, 0.7, 1]}
                  />
                </Path>

                {/* Enhanced capacity indicator with glow effect */}
                <Circle
                  cx={indicatorPosition.x}
                  cy={indicatorPosition.y}
                  r={INDICATOR_GLOW_SIZE}
                  color={chartColors.withOpacity(
                    getCapacityColor(memoryMetrics.capacityScore),
                    0.15
                  )}
                  style="fill"
                />

                <Circle
                  cx={indicatorPosition.x}
                  cy={indicatorPosition.y}
                  r={INDICATOR_SIZE + 2}
                  color={colors.background}
                  style="fill"
                />

                <Circle
                  cx={indicatorPosition.x}
                  cy={indicatorPosition.y}
                  r={INDICATOR_SIZE}
                  color={getCapacityColor(memoryMetrics.capacityScore)}
                  style="fill"
                />

                {/* Inner highlight for 3D effect */}
                <Circle
                  cx={indicatorPosition.x - 1}
                  cy={indicatorPosition.y - 1}
                  r={INDICATOR_SIZE - 3}
                  color={chartColors.withOpacity(colors.background, 0.4)}
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

            {/* Enhanced tap hint with better positioning */}
            <View style={styles.tapHintContainer}>
              <ThemedText type="caption" variant="secondary" style={styles.tapHint}>
                Tap for insights
              </ThemedText>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Enhanced recommendation section with better spacing */}
        <View style={styles.recommendationContainer}>
          <ThemedText type="caption" variant="secondary" style={styles.recommendationText}>
            {getRecommendationMessage(memoryMetrics.capacityScore)}
          </ThemedText>
        </View>
      </BaseChart>
    );
  }
);

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
    bottom: 40,
    justifyContent: 'center',
    position: 'absolute',
  },
  gaugeContainer: {
    alignItems: 'center',
    height: GAUGE_HEIGHT + 80,
    justifyContent: 'center',
    position: 'relative',
  },
  recommendationContainer: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
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
});
