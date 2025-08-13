import { Ionicons } from '@expo/vector-icons';
import { Canvas, Circle, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

import { BaseChart } from '@charts/BaseChart';
import { useChartColors } from '@charts/chartColors';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useMemoryCapacityGauge } from '@/hooks/vocabulary';
import type { StudyWord } from '@/types/vocabulary.types';

interface MemoryCapacityGaugeProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
}

// Enhanced gauge configuration for better visual appeal using golden ratio
const GOLDEN_RATIO = 1.618; // True golden ratio for optimal gauge proportions
const GAUGE_WIDTH = 320;
const GAUGE_HEIGHT = Math.round(GAUGE_WIDTH / GOLDEN_RATIO); // ~198, following golden ratio
const GAUGE_RADIUS = Math.round(GAUGE_HEIGHT * 0.7); // Proportional radius based on height
const GAUGE_STROKE_WIDTH = 20;
const INDICATOR_SIZE = 12;
const INDICATOR_GLOW_SIZE = 24;
const START_ANGLE = 185;
const TOTAL_SWEEP = 170;

export const MemoryCapacityGauge = memo<MemoryCapacityGaugeProps>(
  ({ studyWords = [], onInfoPress }) => {
    const colors = useColors();
    const chartColors = useChartColors();

    const {
      gaugePaths,
      getFilledGradientColors,
      getFilledGradientPositions,
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

    // Get the score that should be displayed (matches visual gauge)
    const displayScore = getDisplayScore();

    // Animated score value using Reanimated (fallback for environments where Skia useValue is unavailable)
    const scoreShared = useSharedValue(0);
    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
      const next = Math.max(0, Math.min(100, displayScore));
      const delta = Math.abs(scoreShared.value - next);
      if (delta < 0.5) return;
      scoreShared.value = withTiming(next, {
        duration: TIMING_CONFIG.GENTLE.duration,
        easing: TIMING_CONFIG.GENTLE.easing,
      });
    }, [displayScore, scoreShared]);

    // Push only rounded values to JS to limit re-renders (max 100 updates)
    useAnimatedReaction(
      () => Math.round(scoreShared.value),
      (rounded, prev) => {
        if (rounded !== prev) {
          runOnJS(setAnimatedScore)(rounded);
        }
      }
    );

    // Static geometry values
    const centerX = GAUGE_WIDTH / 2;
    const centerY = GAUGE_HEIGHT - 15;
    const indicatorRadius = GAUGE_RADIUS - GAUGE_STROKE_WIDTH / 2;
    const sweep = (animatedScore / 100) * TOTAL_SWEEP;
    const animatedFilledPath = useMemo(() => {
      const p = Skia.Path.Make();
      p.addArc(
        {
          x: centerX - GAUGE_RADIUS,
          y: centerY - GAUGE_RADIUS,
          width: GAUGE_RADIUS * 2,
          height: GAUGE_RADIUS * 2,
        },
        START_ANGLE,
        sweep
      );
      return p;
    }, [centerX, centerY, sweep]);

    const angle = START_ANGLE - (animatedScore / 100) * TOTAL_SWEEP;
    const angleRad = (angle * Math.PI) / 180;
    const indicatorX = centerX + Math.cos(angleRad) * indicatorRadius;
    const indicatorY = centerY + Math.sin(angleRad) * indicatorRadius;
    const gradientEnd = vec(
      GAUGE_WIDTH * 0.05 + (GAUGE_WIDTH * 0.9 * sweep) / TOTAL_SWEEP,
      GAUGE_HEIGHT / 2
    );

    return (
      <BaseChart
        contentHeight={GAUGE_HEIGHT + 80}
        emptyStateText={STRINGS.ADD_WORDS_TO_SEE_CAPACITY}
        hasData={studyWords.length > 0}
        hideTitle={true}
        onCardPress={onInfoPress}
      >
        <View style={styles.container}>
          {/* Top-right info indicator; stays visible even without handler for future use */}
          {onInfoPress ? (
            <Pressable
              accessibilityLabel={STRINGS.INFO}
              hitSlop={8}
              onPress={onInfoPress}
              style={styles.infoIndicator}
            >
              <Ionicons
                name="information-circle"
                size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                color={chartColors.withOpacity(colors.secondaryText, 0.55)}
              />
            </Pressable>
          ) : (
            <View pointerEvents="none" style={styles.infoIndicator}>
              <Ionicons
                name="information-circle"
                size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                color={chartColors.withOpacity(colors.secondaryText, 0.4)}
              />
            </View>
          )}
          <View style={styles.gaugeContainer}>
            <Canvas style={styles.canvas}>
              <Group>
                {/* Background track */}
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
                      chartColors.performance.poor,
                      chartColors.performance.moderate,
                      chartColors.performance.good,
                      chartColors.performance.excellent,
                    ]}
                  />
                </Path>

                {/* Filled portion */}
                <Path
                  path={animatedFilledPath}
                  strokeCap="round"
                  strokeWidth={GAUGE_STROKE_WIDTH}
                  style="stroke"
                >
                  <LinearGradient
                    colors={getFilledGradientColors()}
                    positions={getFilledGradientPositions()}
                    start={vec(GAUGE_WIDTH * 0.05, GAUGE_HEIGHT / 2)}
                    end={gradientEnd}
                  />
                </Path>

                {/* Indicator with glow */}
                <Circle
                  color={chartColors.withOpacity(getCapacityColor(), 0.15)}
                  cx={indicatorX}
                  cy={indicatorY}
                  r={INDICATOR_GLOW_SIZE}
                  style="fill"
                />
                <Circle
                  color={colors.background}
                  cx={indicatorX}
                  cy={indicatorY}
                  r={INDICATOR_SIZE + 2}
                  style="fill"
                />
                <Circle
                  color={getCapacityColor()}
                  cx={indicatorX}
                  cy={indicatorY}
                  r={INDICATOR_SIZE}
                  style="fill"
                />
                <Circle
                  color={chartColors.withOpacity(colors.background, 0.4)}
                  cx={indicatorX - 1}
                  cy={indicatorY - 1}
                  r={INDICATOR_SIZE - 3}
                  style="fill"
                />
              </Group>
            </Canvas>

            {/* Center percentage */}
            <View style={styles.centerSection}>
              <ThemedText style={[styles.capacityText, { color: getCapacityColor() }]}>
                {Math.round(animatedScore)}%
              </ThemedText>
            </View>
          </View>

          {/* Bottom readiness/status */}
          <View style={styles.bottomSection}>
            <View style={[styles.actionCard, { backgroundColor: getActionCardBackground() }]}>
              <ThemedText style={[styles.actionText, { color: getCapacityColor() }]}>
                {getReadinessMessage()}
              </ThemedText>
            </View>
          </View>
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.HEAVY,
    includeFontPadding: false,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
    lineHeight: MIN_TOUCH_TARGET.MEDIUM,
    textAlign: 'center',
  },
  centerSection: {
    alignItems: 'center',
    bottom: MIN_TOUCH_TARGET.LARGE + LAYOUT.SPACING.TINY,
    justifyContent: 'center',
    position: 'absolute',
  },
  gaugeContainer: {
    alignItems: 'center',
    height: GAUGE_HEIGHT + LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
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
  container: {
    position: 'relative',
  },
  infoIndicator: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY,
    right: LAYOUT.SPACING.TINY,
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
