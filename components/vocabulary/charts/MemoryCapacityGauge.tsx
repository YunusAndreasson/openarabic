import { Ionicons } from '@expo/vector-icons';
import { Canvas, Path, Circle, Group, LinearGradient, vec } from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BaseChart } from '@/components/vocabulary/shared';
import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useNavigationWithDebounce } from '@/hooks';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useMemoryCapacityGauge } from '@/hooks/vocabulary';
import type { StudyWord, StatCategory } from '@/types/vocabulary.types';

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
} as const satisfies Record<string, number>;

export const MemoryCapacityGauge = memo<MemoryCapacityGaugeProps>(({ studyWords = [] }) => {
  const colors = useColors();
  const chartColors = useChartColors();
  const { navigateTo } = useNavigationWithDebounce();

  // Press animation for insights button
  const {
    animatedStyle: animatedPressStyle,
    handlePressIn: handleInsightsPressIn,
    handlePressOut: handleInsightsPressOut,
  } = usePressAnimation({ scaleAmount: 0.98 });

  const {
    memoryMetrics,
    gaugePaths,
    getFilledGradientColors,
    getFilledGradientPositions,
    indicatorPosition,
    getCapacityColor,
    getReadinessMessage,
  } = useMemoryCapacityGauge({
    studyWords,
    width: GAUGE_WIDTH,
    height: GAUGE_HEIGHT,
    radius: GAUGE_RADIUS,
    strokeWidth: GAUGE_STROKE_WIDTH,
  });

  // Enhanced navigation with haptic feedback
  const handleInsightsPress = () => {
    navigateTo('/insights');
  };

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
      <Animated.View style={animatedPressStyle as ViewStyle}>
        <View style={styles.gaugeContainer}>
          {/* Info button in top right corner */}
          <TouchableOpacity
            style={styles.infoButton}
            onPress={handleInsightsPress}
            onPressIn={handleInsightsPressIn}
            onPressOut={handleInsightsPressOut}
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
                strokeWidth={GAUGE_STROKE_WIDTH}
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY / 2,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT * 5,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.LARGE + LAYOUT.SPACING.TINY / 2,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  statusLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '800',
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.METADATA.letterSpacing * 4,
    opacity: LAYOUT.OPACITY.FULL,
    textAlign: 'center',
  },
  actionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
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
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  readinessText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  tapHint: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    includeFontPadding: false,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.METADATA.letterSpacing,
    opacity: LAYOUT.OPACITY.PRESSED,
    textAlign: 'center',
  },
  trendIndicator: {
    borderRadius: LAYOUT.SPACING.TINY - 1,
    height: LAYOUT.SPACING.TINY + LAYOUT.SPACING.TINY / 2,
    marginLeft: LAYOUT.SPACING.TINY + LAYOUT.SPACING.TINY / 2,
    opacity: LAYOUT.OPACITY.HOVER,
    width: LAYOUT.SPACING.TINY + LAYOUT.SPACING.TINY / 2,
  },
});
