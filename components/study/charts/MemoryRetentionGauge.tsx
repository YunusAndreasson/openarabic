import { BaseChart } from '@charts/BaseChart';
import { useChartColors } from '@charts/ChartColors';
import { Ionicons } from '@expo/vector-icons';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  cancelAnimation,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
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
  GOOD: MEMORY_CAPACITY_THRESHOLDS.GOOD, // Green: 75%+ - good retention
} as const;

export function MemoryRetentionGauge({ studyWords = [], onInfoPress }: MemoryRetentionGaugeProps) {
  const colors = useColors();
  const chartColors = useChartColors();
  const { chartData } = useRetrievabilityChart(studyWords);

  // Get current retention value from the chart data
  const currentRetention = chartData.insights.currentRetrievability;

  // Animated retention value using Reanimated
  const retentionShared = useSharedValue(0);
  const [animatedRetention, setAnimatedRetention] = useState(0);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      try {
        cancelAnimation(retentionShared);
        retentionShared.value = 0;
      } catch {
        // Animation cleanup failed - continue
      }
    };
  }, [retentionShared]);

  // Track previous retention to detect when entering green area
  const prevRetentionRef = useRef(0);
  const hasTriggeredGreenHapticRef = useRef(false);

  useEffect(() => {
    const next = Math.max(0, Math.min(100, currentRetention));
    const delta = Math.abs(retentionShared.get() - next);
    if (delta < 0.5) return;

    // Check if we're entering the green area (75%+) for the first time
    const wasBelowGreen = prevRetentionRef.current < MEMORY_CAPACITY_THRESHOLDS.GOOD;
    const isNowGreen = next >= MEMORY_CAPACITY_THRESHOLDS.GOOD;

    if (wasBelowGreen && isNowGreen && !hasTriggeredGreenHapticRef.current) {
      // Trigger celebratory haptic feedback when entering green area
      // Sequence: success + medium impact for a strong dopamine hit
      successFeedback();
      setTimeout(() => mediumFeedback(), TIMING_CONFIG.FAST.duration); // Small delay for distinct feel
      hasTriggeredGreenHapticRef.current = true;
    }

    // Reset haptic trigger if user drops below green area
    if (next < MEMORY_CAPACITY_THRESHOLDS.GOOD) {
      hasTriggeredGreenHapticRef.current = false;
    }

    // Update previous retention
    prevRetentionRef.current = next;

    retentionShared.set(
      withSpring(next, {
        ...SPRING_CONFIG.CARD,
        overshootClamping: true, // Prevent going beyond target value
      }),
    );
  }, [currentRetention, retentionShared]);

  // Push only rounded values to JS to limit re-renders
  useAnimatedReaction(
    () => Math.round(retentionShared.get()),
    (rounded, prev) => {
      if (rounded !== prev) {
        scheduleOnRN(setAnimatedRetention, rounded);
      }
    },
  );

  // Static geometry values
  const sweep = (animatedRetention / 100) * TOTAL_SWEEP;

  // React Compiler auto-memoizes
  const animatedFilledPath = Skia.Path.Make();
  animatedFilledPath.addArc(GAUGE_BOUNDS, START_ANGLE, sweep);

  // Create full background track path (React Compiler auto-memoizes)
  const backgroundTrackPath = Skia.Path.Make();
  backgroundTrackPath.addArc(GAUGE_BOUNDS, START_ANGLE, TOTAL_SWEEP);

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

  const retentionColor = getRetentionColor();

  // React Compiler auto-memoizes
  const dynamicStyles = {
    retentionText: { color: retentionColor },
  };

  return (
    <BaseChart
      contentHeight={GAUGE_HEIGHT + 20}
      hasData={true}
      hideTitle={true}
      onCardPress={onInfoPress}
    >
      <View style={styles.container}>
        {/* Chevron indicator in top-right corner */}
        <View style={styles.chevronContainer}>
          <Ionicons
            name="chevron-forward"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.disabled}
          />
        </View>

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

          {/* Center percentage - positioned to not block touch events */}
          <View style={styles.centerSection} pointerEvents="none">
            <ThemedText style={[styles.retentionText, dynamicStyles.retentionText]}>
              {Math.round(animatedRetention)}%
            </ThemedText>
          </View>

          {/* Transparent touch overlay to ensure entire gauge area is tappable */}
          <Pressable style={styles.touchOverlay} onPress={onInfoPress} pointerEvents="box-only" />
        </View>

        {/* Memory Strength label below gauge */}
        <ThemedText type="caption" colorName="textTertiary" style={styles.memoryStrengthLabel}>
          {STRINGS.MEMORY_STRENGTH}
        </ThemedText>
      </View>
    </BaseChart>
  );
}

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

  container: {
    position: 'relative',
  },
  memoryStrengthLabel: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  chevronContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY,
    right: LAYOUT.SPACING.SMALL,
    zIndex: 10,
  },
});
