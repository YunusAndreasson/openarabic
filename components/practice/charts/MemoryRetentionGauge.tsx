import { BaseChart } from '@/components/common/charts/BaseChart';
import { CHART_OPACITY, useChartColors } from '@/constants/chartColors';
import { Canvas, Group, Line, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { FONTS } from '@/constants/fonts';
import { GOLDEN_RATIO, LAYOUT, LETTER_SPACING, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import type { StudyWord } from '@/types/vocabulary.types';
import { successFeedback } from '@/utils/haptics';
import { withOpacity } from '@/utils/colorUtils';

interface MemoryRetentionGaugeProps {
  studyWords: StudyWord[];
  onInfoPress?: () => void;
  /** Render without the BaseChart card shell (for use inside sheets) */
  embedded?: boolean;
}

// Gauge geometry using golden ratio proportions
const GAUGE_WIDTH = 320;
const GAUGE_HEIGHT = Math.round(GAUGE_WIDTH / GOLDEN_RATIO); // ~198, following golden ratio
const GAUGE_RADIUS = Math.round(GAUGE_HEIGHT * 0.7); // Proportional radius based on height
const GAUGE_STROKE_WIDTH = 14;
const START_ANGLE = 185;
const TOTAL_SWEEP = 170;
const TICK_OVERHANG = 2; // How far threshold ticks extend past the track edge

// Static geometry values - calculated once
const CENTER_X = GAUGE_WIDTH / 2;
const CENTER_Y = GAUGE_HEIGHT - 15;
const GAUGE_BOUNDS = {
  x: CENTER_X - GAUGE_RADIUS,
  y: CENTER_Y - GAUGE_RADIUS,
  width: GAUGE_RADIUS * 2,
  height: GAUGE_RADIUS * 2,
};

// Full arc built once — progress renders by trimming the path's `end`
// on the UI thread, never by rebuilding geometry from React state.
const FULL_ARC_PATH = Skia.PathBuilder.Make()
  .addArc(GAUGE_BOUNDS, START_ANGLE, TOTAL_SWEEP)
  .build();

// Memory retention thresholds for color coding - centralized constants
const RETENTION_THRESHOLDS = {
  POOR: MEMORY_CAPACITY_THRESHOLDS.POOR, // Red: <40% - urgent practice needed
  MODERATE: MEMORY_CAPACITY_THRESHOLDS.MODERATE, // Orange: 40-69% - needs attention
  GOOD: MEMORY_CAPACITY_THRESHOLDS.GOOD, // Green: 75%+ - good retention
} as const;

/** Endpoints of a tick line crossing the track arc at a given retention % */
const tickLineAt = (percentage: number) => {
  const angleDeg = START_ANGLE + (percentage / 100) * TOTAL_SWEEP;
  const angleRad = (angleDeg * Math.PI) / 180;
  const innerR = GAUGE_RADIUS - GAUGE_STROKE_WIDTH / 2 - TICK_OVERHANG;
  const outerR = GAUGE_RADIUS + GAUGE_STROKE_WIDTH / 2 + TICK_OVERHANG;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    p1: { x: CENTER_X + innerR * cos, y: CENTER_Y + innerR * sin },
    p2: { x: CENTER_X + outerR * cos, y: CENTER_Y + outerR * sin },
  };
};

const POOR_TICK = tickLineAt(RETENTION_THRESHOLDS.POOR);
const GOOD_TICK = tickLineAt(RETENTION_THRESHOLDS.GOOD);

export function MemoryRetentionGauge({
  studyWords = [],
  onInfoPress,
  embedded = false,
}: MemoryRetentionGaugeProps) {
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

  useEffect(() => {
    const next = Math.max(0, Math.min(100, currentRetention));
    retentionShared.set(
      withSpring(next, {
        ...SPRING_CONFIG.CARD,
        overshootClamping: true, // Prevent going beyond target value
      }),
    );
  }, [currentRetention, retentionShared]);

  // Success haptic on the frame the SPRINGED needle crosses into the green
  // zone, so it lands with the visual moment rather than at data-update time.
  // Rising-edge only; dropping below green re-arms it.
  useAnimatedReaction(
    () => {
      'worklet';
      return retentionShared.value >= MEMORY_CAPACITY_THRESHOLDS.GOOD;
    },
    (isGreen, wasGreen) => {
      if (isGreen && wasGreen === false) {
        scheduleOnRN(successFeedback);
      }
    },
  );

  // Push only rounded values to JS to limit re-renders (center text only)
  useAnimatedReaction(
    () => {
      'worklet';
      return Math.round(retentionShared.value);
    },
    (rounded, prev) => {
      if (rounded !== prev) {
        scheduleOnRN(setAnimatedRetention, rounded);
      }
    },
  );

  // UI-thread arc trim — the fill follows the spring pixel-perfectly
  const trimEnd = useDerivedValue(() => {
    'worklet';
    return Math.max(0, Math.min(1, retentionShared.value / 100));
  });

  // Status colors resolved in JS, picked per-frame on the UI thread
  const poorColor = chartColors.performance.poor;
  const moderateColor = chartColors.performance.moderate;
  const excellentColor = chartColors.performance.excellent;

  const fillColor = useDerivedValue(() => {
    'worklet';
    const value = retentionShared.value;
    if (value < RETENTION_THRESHOLDS.POOR) return poorColor;
    if (value < RETENTION_THRESHOLDS.GOOD) return moderateColor;
    return excellentColor;
  });

  // Track is a lighter step of the SAME hue as the fill (meter rule),
  // so state reads across the whole bar — never a gray border color.
  const poorTrack = withOpacity(poorColor, CHART_OPACITY.TRACK);
  const moderateTrack = withOpacity(moderateColor, CHART_OPACITY.TRACK);
  const excellentTrack = withOpacity(excellentColor, CHART_OPACITY.TRACK);

  const trackColor = useDerivedValue(() => {
    'worklet';
    const value = retentionShared.value;
    if (value < RETENTION_THRESHOLDS.POOR) return poorTrack;
    if (value < RETENTION_THRESHOLDS.GOOD) return moderateTrack;
    return excellentTrack;
  });

  // Discrete status color for the center number (from the rounded JS state)
  const getRetentionColor = () => {
    if (animatedRetention < RETENTION_THRESHOLDS.POOR) {
      return poorColor;
    } else if (animatedRetention < RETENTION_THRESHOLDS.GOOD) {
      return moderateColor;
    }
    return excellentColor;
  };

  const retentionColor = getRetentionColor();

  // React Compiler auto-memoizes
  const dynamicStyles = {
    retentionText: { color: retentionColor },
  };

  const gauge = (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.gaugeContainer}>
        <Canvas style={styles.canvas} pointerEvents="none">
          <Group>
            {/* Full track - lighter step of the fill's own hue */}
            <Path
              color={trackColor}
              path={FULL_ARC_PATH}
              strokeCap="round"
              strokeWidth={GAUGE_STROKE_WIDTH}
              style="stroke"
            />

            {/* Filled portion - UI-thread path trim, no geometry rebuilds */}
            <Path
              path={FULL_ARC_PATH}
              start={0}
              end={trimEnd}
              strokeCap="round"
              strokeWidth={GAUGE_STROKE_WIDTH}
              color={fillColor}
              style="stroke"
            />

            {/* Threshold ticks at 40% and 75% - crisp card-colored geometry */}
            <Line
              p1={POOR_TICK.p1}
              p2={POOR_TICK.p2}
              color={colors.card}
              strokeWidth={2}
              style="stroke"
            />
            <Line
              p1={GOOD_TICK.p1}
              p2={GOOD_TICK.p2}
              color={colors.card}
              strokeWidth={2}
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

      {/* Label below gauge — redundant inside the memory sheet, whose header
          already carries the title */}
      {!embedded && (
        <ThemedText type="caption" colorName="subtleLabelText" style={styles.memoryStrengthLabel}>
          {STRINGS.MEMORY_STRENGTH}
        </ThemedText>
      )}
    </View>
  );

  if (embedded) {
    return gauge;
  }

  return (
    <BaseChart
      contentHeight={GAUGE_HEIGHT + 20}
      hasData={studyWords.length > 0}
      emptyStateText={STRINGS.STUDY_WORDS_TO_TRACK_MEMORY_RETENTION}
      onCardPress={onInfoPress}
    >
      {gauge}
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MASSIVE,
    fontFamily: FONTS.ENGLISH_BOLD,
    includeFontPadding: false,
    letterSpacing: LETTER_SPACING.TIGHT,
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
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
