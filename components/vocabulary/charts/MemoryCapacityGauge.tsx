import { Canvas, Circle, Group, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BaseChart } from '@/components/vocabulary/shared/BaseChart';
import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import { INSIGHTS_BUTTON_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useNavigationWithDebounce } from '@/hooks';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useMemoryCapacityGauge } from '@/hooks/vocabulary';
import type { StudyWord } from '@/types/vocabulary.types';

interface MemoryCapacityGaugeProps {
  studyWords: StudyWord[];
}

// Enhanced gauge configuration for better visual appeal
const GAUGE_WIDTH = 320;
const GAUGE_HEIGHT = 180;
const GAUGE_RADIUS = 140;
const GAUGE_STROKE_WIDTH = 20;
const INDICATOR_SIZE = 12;
const INDICATOR_GLOW_SIZE = 24;

export const MemoryCapacityGauge = memo<MemoryCapacityGaugeProps>(({ studyWords = [] }) => {
  const colors = useColors();
  const chartColors = useChartColors();
  const { navigateTo } = useNavigationWithDebounce();

  // Press animation for insights button
  const {
    animatedStyle: animatedPressStyle,
    handlePressIn,
    handlePressOut,
  } = usePressAnimation({ scaleAmount: INSIGHTS_BUTTON_PRESS_SCALE });

  const {
    memoryMetrics,
    gaugePaths,
    getFilledGradientColors,
    getFilledGradientPositions,
    indicatorPosition,
    getCapacityColor,
    getReadinessMessage,
    getActionCardBackground,
    getDisplayScore,
  } = useMemoryCapacityGauge({
    studyWords,
    width: GAUGE_WIDTH,
    height: GAUGE_HEIGHT,
    radius: GAUGE_RADIUS,
    strokeWidth: GAUGE_STROKE_WIDTH,
  });

  // Enhanced navigation with haptic feedback
  const handleInsightsPress = () => {
    navigateTo(ROUTE_PATHS.INSIGHTS);
  };

  // Get the score that should be displayed (matches visual gauge)
  const displayScore = getDisplayScore();

  return (
    <BaseChart
      contentHeight={GAUGE_HEIGHT + 76}
      emptyStateText={STRINGS.ADD_WORDS_TO_SEE_CAPACITY}
      hasData={studyWords.length > 0}
      hideTitle={true}
    >
      <TouchableOpacity
        onPress={handleInsightsPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={LAYOUT.OPACITY.HIGH}
      >
        <Animated.View style={animatedPressStyle as ViewStyle}>
          <View style={styles.gaugeContainer}>
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
                    colors={getFilledGradientColors()}
                    positions={getFilledGradientPositions()}
                    start={vec(GAUGE_WIDTH * 0.05, GAUGE_HEIGHT / 2)}
                    end={vec(
                      GAUGE_WIDTH * 0.05 + (GAUGE_WIDTH * 0.9 * gaugePaths.filledSweep) / 170,
                      GAUGE_HEIGHT / 2
                    )}
                  />
                </Path>

                {/* Enhanced capacity indicator with glow effect */}
                <Circle
                  color={chartColors.withOpacity(getCapacityColor(displayScore), 0.15)}
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
                  color={getCapacityColor(displayScore)}
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
                  style={[styles.capacityText, { color: getCapacityColor(displayScore) }]}
                >
                  {displayScore}%
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
                styles.actionCard,
                {
                  backgroundColor: getActionCardBackground(displayScore),
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.actionText,
                  {
                    color: getCapacityColor(displayScore),
                  },
                ]}
              >
                {getReadinessMessage()}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.5,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
    lineHeight: MIN_TOUCH_TARGET.MEDIUM,
    textAlign: 'center',
  },
  centerSection: {
    alignItems: 'center',
    bottom: MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.MICRO,
    justifyContent: 'center',
    position: 'absolute',
  },
  gaugeContainer: {
    alignItems: 'center',
    height: GAUGE_HEIGHT + LAYOUT.SPACING.LARGE,
    justifyContent: 'center',
    position: 'relative',
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  actionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
  },
  actionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    includeFontPadding: false,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
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
  trendIndicator: {
    borderRadius: LAYOUT.SPACING.TINY - 1,
    height: LAYOUT.SPACING.TINY + LAYOUT.SPACING.TINY / 2,
    marginLeft: LAYOUT.SPACING.TINY + LAYOUT.SPACING.TINY / 2,
    opacity: LAYOUT.OPACITY.HOVER,
    width: LAYOUT.SPACING.TINY + LAYOUT.SPACING.TINY / 2,
  },
});
