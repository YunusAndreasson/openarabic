import { Ionicons } from '@expo/vector-icons';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withSpring } from 'react-native-reanimated';

import { BaseChart } from '@charts/BaseChart';
import { useChartColors } from '@charts/chartColors';

import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import type { StudyWord } from '@/types/vocabulary.types';
import { mediumFeedback, successFeedback } from '@/utils/haptics';

interface MemoryRetentionGaugeProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
}

// Enhanced gauge configuration for better visual appeal using golden ratio
const GOLDEN_RATIO = 1.618; // True golden ratio for optimal gauge proportions
const GAUGE_WIDTH = 320;
const GAUGE_HEIGHT = Math.round(GAUGE_WIDTH / GOLDEN_RATIO); // ~198, following golden ratio
const GAUGE_RADIUS = Math.round(GAUGE_HEIGHT * 0.7); // Proportional radius based on height
const GAUGE_STROKE_WIDTH = 20;
const START_ANGLE = 185;
const TOTAL_SWEEP = 170;

// Static geometry values - calculated once
const CENTER_X = GAUGE_WIDTH / 2;
const CENTER_Y = GAUGE_HEIGHT - 15;
const GAUGE_BOUNDS = {
  x: CENTER_X - GAUGE_RADIUS,
  y: CENTER_Y - GAUGE_RADIUS,
  width: GAUGE_RADIUS * 2,
  height: GAUGE_RADIUS * 2,
};

// Memory retention thresholds for color coding - now using centralized constants
const RETENTION_THRESHOLDS = {
  POOR: MEMORY_CAPACITY_THRESHOLDS.POOR, // Red: <40% - urgent practice needed
  MODERATE: MEMORY_CAPACITY_THRESHOLDS.MODERATE, // Orange: 40-69% - needs attention
  GOOD: MEMORY_CAPACITY_THRESHOLDS.GOOD, // Green: 70%+ - good retention
} as const;

export const MemoryRetentionGauge = memo<MemoryRetentionGaugeProps>(
  ({ studyWords = [], onInfoPress }) => {
    const colors = useColors();
    const chartColors = useChartColors();
    const { chartData } = useRetrievabilityChart(studyWords);

    // Get current retention value from the chart data
    const currentRetention = chartData.insights.currentRetrievability;

    // Animated retention value using Reanimated
    const retentionShared = useSharedValue(0);
    const [animatedRetention, setAnimatedRetention] = useState(0);

    // Track previous retention to detect when entering green area
    const prevRetentionRef = useRef(0);
    const hasTriggeredGreenHapticRef = useRef(false);

    useEffect(() => {
      const next = Math.max(0, Math.min(100, currentRetention));
      const delta = Math.abs(retentionShared.value - next);
      if (delta < 0.5) return;

      // Check if we're entering the green area (70%+) for the first time
      const wasBelowGreen = prevRetentionRef.current < MEMORY_CAPACITY_THRESHOLDS.GOOD;
      const isNowGreen = next >= MEMORY_CAPACITY_THRESHOLDS.GOOD;

      if (wasBelowGreen && isNowGreen && !hasTriggeredGreenHapticRef.current) {
        // Trigger celebratory haptic feedback when entering green area
        // Sequence: success + medium impact for a strong dopamine hit
        successFeedback();
        setTimeout(() => mediumFeedback(), 100); // Small delay for distinct feel
        hasTriggeredGreenHapticRef.current = true;
      }

      // Reset haptic trigger if user drops below green area
      if (next < MEMORY_CAPACITY_THRESHOLDS.GOOD) {
        hasTriggeredGreenHapticRef.current = false;
      }

      // Update previous retention
      prevRetentionRef.current = next;

      retentionShared.value = withSpring(next, {
        ...SPRING_CONFIG.CARD,
        overshootClamping: true, // Prevent going beyond target value
      });
    }, [currentRetention, retentionShared]);

    // Push only rounded values to JS to limit re-renders
    useAnimatedReaction(
      () => Math.round(retentionShared.value),
      (rounded, prev) => {
        if (rounded !== prev) {
          runOnJS(setAnimatedRetention)(rounded);
        }
      }
    );

    // Static geometry values
    const sweep = (animatedRetention / 100) * TOTAL_SWEEP;

    const animatedFilledPath = useMemo(() => {
      const p = Skia.Path.Make();
      p.addArc(GAUGE_BOUNDS, START_ANGLE, sweep);
      return p;
    }, [sweep]);

    // Create full background track path
    const backgroundTrackPath = useMemo(() => {
      const p = Skia.Path.Make();
      p.addArc(GAUGE_BOUNDS, START_ANGLE, TOTAL_SWEEP);
      return p;
    }, []);

    // Determine color based on retention thresholds
    const getRetentionColor = () => {
      if (animatedRetention < RETENTION_THRESHOLDS.POOR) {
        return chartColors.performance.poor; // Red
      } else if (animatedRetention < RETENTION_THRESHOLDS.MODERATE) {
        return chartColors.performance.moderate; // Orange
      } else {
        return chartColors.performance.excellent; // Green
      }
    };

    // Get retention status message
    const getRetentionMessage = () => {
      if (animatedRetention < RETENTION_THRESHOLDS.POOR) {
        return STRINGS.MEMORY_CAPACITY_LOW; // "Low retention - practice needed"
      } else if (animatedRetention < RETENTION_THRESHOLDS.MODERATE) {
        return STRINGS.MEMORY_CAPACITY_MEDIUM; // "Moderate retention - keep practicing"
      } else {
        return STRINGS.MEMORY_CAPACITY_HIGH; // "Good retention - well done!"
      }
    };

    const retentionColor = getRetentionColor();
    const retentionMessage = getRetentionMessage();

    const dynamicStyles = useMemo(
      () => ({
        retentionText: { color: retentionColor },
        actionCard: { backgroundColor: chartColors.withOpacity(retentionColor, 0.1) },
        actionText: { color: retentionColor },
      }),
      [retentionColor, chartColors]
    );

    return (
      <BaseChart
        contentHeight={GAUGE_HEIGHT + 80}
        emptyStateText={STRINGS.STUDY_WORDS_TO_TRACK_MEMORY_RETENTION}
        hasData={chartData.hasData}
        hideTitle={true}
        onCardPress={onInfoPress}
      >
        <View style={styles.container}>
          {/* Top-right info indicator */}
          {onInfoPress ? (
            <Pressable
              accessibilityLabel={STRINGS.MEMORY_CAPACITY_INFO}
              hitSlop={8}
              onPress={onInfoPress}
              style={styles.infoIndicator}
            >
              <Ionicons
                name="information-circle"
                size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                color={colors.elevation3}
              />
            </Pressable>
          ) : (
            <View pointerEvents="none" style={styles.infoIndicator}>
              <Ionicons
                name="information-circle"
                size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                color={chartColors.withOpacity(colors.text, 0.6)}
              />
            </View>
          )}

          <View style={styles.gaugeContainer}>
            <Canvas style={styles.canvas}>
              <Group>
                {/* Full background track - always shows complete arc from 0% to 100% */}
                <Path
                  color={colors.border}
                  path={backgroundTrackPath}
                  strokeCap="round"
                  strokeWidth={GAUGE_STROKE_WIDTH}
                  style="stroke"
                />

                {/* Filled portion - shows current progress */}
                <Path
                  path={animatedFilledPath}
                  strokeCap="round"
                  strokeWidth={GAUGE_STROKE_WIDTH}
                  color={retentionColor}
                  style="stroke"
                />
              </Group>
            </Canvas>

            {/* Center percentage */}
            <View style={styles.centerSection}>
              <ThemedText style={[styles.retentionText, dynamicStyles.retentionText]}>
                {Math.round(animatedRetention)}%
              </ThemedText>
            </View>
          </View>

          {/* Bottom retention status */}
          <View style={styles.bottomSection}>
            <View style={[styles.actionCard, dynamicStyles.actionCard]}>
              <ThemedText style={[styles.actionText, dynamicStyles.actionText]}>
                {retentionMessage}
              </ThemedText>
            </View>
          </View>
        </View>
      </BaseChart>
    );
  }
);

MemoryRetentionGauge.displayName = 'MemoryRetentionGauge';

const styles = StyleSheet.create({
  canvas: {
    height: GAUGE_HEIGHT,
    width: GAUGE_WIDTH,
  },
  retentionText: {
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

    right: LAYOUT.SPACING.MEDIUM,
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});

export default MemoryRetentionGauge;
