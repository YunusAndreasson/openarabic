import {
  Atlas,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  Path,
  rect,
  useRSXformBuffer,
  useTexture,
  vec,
  type SkRect,
} from '@shopify/react-native-skia';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { CHART_OPACITY, useChartColors } from '@/constants/chartColors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import {
  BAND_HEIGHT,
  BAND_WIDTH,
  DOT_RADIUS,
  DOT_TEXTURE_SIZE,
  PLOT_HEIGHT,
  TRACK_PATH,
  dotCenter,
} from '@/utils/horizonBandPath';
import { getHorizonFraction, HORIZON_BAND_KEYS, HORIZON_BAND_LABELS } from '@/utils/memoryHorizon';
import { mixColors } from '@/utils/colorUtils';

/**
 * The memory constellation: every practised word is one dot, placed by how long
 * it currently holds.
 *
 * A unit histogram, not a scatter cloud. The x axis is real time — log-scaled
 * through `getHorizonFraction`, the SAME function the dictionary row's meter
 * uses, so a word's bar in the list and its column here sit at the same place by
 * construction. The y axis is a genuine count: dots stack, so the shape reads as
 * a distribution rather than as noise. Both axes carry data, which is the
 * difference between a chart and decoration.
 *
 * Why per-word marks at all: after a review session the dots visibly MOVE RIGHT
 * as horizons grow. A bar can get taller, but it cannot show a word travelling
 * along the axis — and that journey is the thing spaced repetition is doing.
 *
 * One `Atlas` draws every dot in a single call, positions are computed in a
 * worklet via `useRSXformBuffer`, and the entrance is one `scaleY` on the
 * enclosing group. One transform for the whole field rather than N springs is
 * what keeps this honest on a frame-starved Android device.
 */

/**
 * Axis ticks at the band boundaries — the only labelled positions, and they are
 * the same boundaries `formatHorizon` rounds to, so the axis can never name a
 * span differently from a word's own detail screen.
 */
const AXIS_TICK_DAYS: Record<(typeof HORIZON_BAND_KEYS)[number], number> = {
  // The `days` band opens at 0, which has no position on a log axis; anchor its
  // label at one day, the shortest horizon a real word can carry.
  days: 1,
  weeks: 7,
  months: 30,
  year: 365,
};

const AXIS_TICKS = HORIZON_BAND_KEYS.map(key => ({
  key,
  label: HORIZON_BAND_LABELS[key],
  fraction: getHorizonFraction(AXIS_TICK_DAYS[key]),
}));

interface MemoryHorizonBandProps {
  /** Practised-word count per column. Length is BIN_COUNT. */
  bins: readonly number[];
  /** Words each dot stands for — 1 unless the collection overflows a column. */
  wordsPerDot: number;
  /** 0..1 position of the median horizon; 0 when nothing is practised. */
  medianFraction: number;
  /** False when nothing has been practised: draw the empty axis only. */
  hasDistribution: boolean;
}

/** One (x, y) centre per drawn dot, flattened out of the bins. */
function buildDotSlots(bins: readonly number[], wordsPerDot: number): { x: number; y: number }[] {
  const perDot = Math.max(1, wordsPerDot);
  const slots: { x: number; y: number }[] = [];

  bins.forEach((count, binIndex) => {
    const dots = Math.ceil(count / perDot);
    for (let depth = 0; depth < dots; depth++) {
      slots.push(dotCenter(binIndex, depth));
    }
  });

  return slots;
}

export function MemoryHorizonBand({
  bins,
  wordsPerDot,
  medianFraction,
  hasDistribution,
}: MemoryHorizonBandProps): JSX.Element {
  const colors = useColors();
  const chartColors = useChartColors();

  // The track is a lighter step of the fill's own hue via `mixColors`, NOT an
  // alpha wash: alpha composites toward whatever sits behind it, which on the
  // dark theme is near-black, so a wash turns the rail into a smudge instead of
  // a lighter azure. Same rule the dictionary's SortMeter follows.
  //
  // ZONE rather than TRACK (0.18 vs 0.16) because sepia's accent clamps to a
  // much lower chroma against warm paper, and at TRACK the rail disappeared
  // there — checked on device across all three themes. Still a step, never a
  // second data colour, and never grey.
  const trackColor = mixColors(colors.card, chartColors.ui.accent, CHART_OPACITY.ZONE);

  const slots = buildDotSlots(bins, wordsPerDot);
  const dotCount = slots.length;

  // A single dot, drawn once into a texture and stamped N times by Atlas. The
  // colour is baked in rather than passed per-instance because every dot in this
  // field is the same accent — one accent carries all data ink.
  const dotTexture = useTexture(
    <Circle c={vec(DOT_RADIUS, DOT_RADIUS)} r={DOT_RADIUS} color={chartColors.ui.dataLine} />,
    { width: DOT_TEXTURE_SIZE, height: DOT_TEXTURE_SIZE },
    [chartColors.ui.dataLine],
  );

  const sprites: SkRect[] = slots.map(() => rect(0, 0, DOT_TEXTURE_SIZE, DOT_TEXTURE_SIZE));

  // Positions resolved on the UI thread. `set` takes (scos, ssin, tx, ty):
  // (1, 0) means no rotation and no scale, so each dot is only translated — and
  // Atlas places a sprite by its top-left corner, hence the radius offset.
  const transforms = useRSXformBuffer(dotCount, (val, index) => {
    'worklet';
    const slot = slots[index];
    if (!slot) {
      val.set(1, 0, 0, 0);
      return;
    }
    val.set(1, 0, slot.x - DOT_RADIUS, slot.y - DOT_RADIUS);
  });

  // Grow the whole field off the baseline as one transform.
  const growth = useSharedValue(0);
  const settle = useSharedValue(0);

  useEffect(() => {
    growth.value = 0;
    settle.value = 0;
    growth.value = withTiming(1, TIMING_CONFIG.PROGRESS);
    // The median rule annotates the shape, so it lands after the shape does —
    // the same settle idiom the vocabulary sparkline uses.
    settle.value = withDelay(
      TIMING_CONFIG.PROGRESS.duration,
      withTiming(1, TIMING_CONFIG.ENTRANCE),
    );
  }, [growth, settle, dotCount]);

  const growTransform = useDerivedValue(() => {
    'worklet';
    return [{ scaleY: growth.value }];
  });

  const medianX = medianFraction * BAND_WIDTH;

  return (
    <View>
      <Canvas style={styles.canvas} pointerEvents="none">
        {/* The empty axis. Present from the first frame and never animated: a
            learner with nothing practised should meet a year of labelled runway,
            not a grey empty-state box. */}
        <Path path={TRACK_PATH} color={trackColor} />

        {hasDistribution && dotCount > 0 && (
          <Group transform={growTransform} origin={vec(0, PLOT_HEIGHT)}>
            <Atlas image={dotTexture} sprites={sprites} transforms={transforms} />
          </Group>
        )}

        {/* Baseline anchors the stubs into one axis. */}
        <Line
          p1={vec(0, PLOT_HEIGHT)}
          p2={vec(BAND_WIDTH, PLOT_HEIGHT)}
          color={chartColors.ui.grid}
          strokeWidth={StyleSheet.hairlineWidth}
          style="stroke"
        />

        {/* Median rule. Dashed because it is a rule, not a series — the same
            distinction the word-detail forgetting curve draws. */}
        {hasDistribution && medianFraction > 0 && (
          <Group opacity={settle}>
            <Line
              p1={vec(medianX, 0)}
              p2={vec(medianX, BAND_HEIGHT)}
              color={chartColors.ui.threshold}
              strokeWidth={1}
              style="stroke"
            >
              <DashPathEffect intervals={[3, 4]} />
            </Line>
          </Group>
        )}
      </Canvas>

      {/* Labels are RN text over the canvas, never Skia text: only these honour
          Dynamic Type, the theme's own token, and the accessibility tree. The
          whole row is hidden from screen readers by the card that owns it. */}
      <View style={styles.axis} pointerEvents="none">
        {AXIS_TICKS.map(tick => (
          <ThemedText
            key={tick.key}
            type="caption"
            colorName="subtleLabelText"
            // A label marks where its band BEGINS, so it is left-aligned on the
            // tick — except the last, whose tick sits at the very right edge
            // (fraction 1.0 by definition) and which would otherwise render
            // entirely off-canvas.
            style={[
              styles.axisLabel,
              tick.fraction >= 1
                ? { right: LAYOUT.SPACING.MEDIUM }
                : { left: tick.fraction * BAND_WIDTH },
            ]}
          >
            {tick.label}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

MemoryHorizonBand.displayName = 'MemoryHorizonBand';

const styles = StyleSheet.create({
  canvas: {
    height: BAND_HEIGHT,
    width: BAND_WIDTH,
  },
  axis: {
    height: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
  },
  axisLabel: {
    position: 'absolute',
    top: 0,
  },
});
