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
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useIsFocused, useNavigation } from 'expo-router';
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Direct path, not the `charts` barrel: that barrel also re-exports
// `VocabularyChart`, and Metro does not tree-shake — importing it here
// would evaluate the whole line-chart stack on the practice tab's first
// render for a component that draws no line chart.
import { ChartBaseline } from '@/components/common/charts/ChartBaseline';
import { ThemedText } from '@/components/primitives/ThemedText';
import { HORIZON_TRAVEL, TIMING_CONFIG } from '@/constants/animation';
import { CHART_OPACITY, getChartColors, getMeterTrackColor } from '@/constants/chartColors';
import { INLINE_VALUE_MIN_WIDTH, LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { RootId } from '@/types/branded.types';
import { commitFeedback, selectionFeedback } from '@/utils/haptics';
import {
  departureShare,
  layOutDots,
  planDotTravel,
  type DotField,
  type DotMover,
  type DotSlot,
} from '@/utils/horizonBandTravel';
import {
  BAND_HEIGHT,
  BAND_WIDTH,
  DOT_RADIUS,
  DOT_TEXTURE_SIZE,
  PLOT_HEIGHT,
  TRACK_PATH,
} from '@/utils/horizonBandPath';
import { planTravelHaptics, type TravelHapticBeat } from '@/utils/horizonTravelHaptics';
import { getHorizonFraction, HORIZON_BAND_KEYS, HORIZON_BAND_LABELS } from '@/utils/memoryHorizon';

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
 * That sentence was a promise the drawing did not keep for a long time: the
 * field was rebuilt in its new shape, so a reviewed word's dot vanished from one
 * column and was simply present in another. Now the dots a change touched
 * travel — see `planDotTravel` for which those are — while the rest of the field
 * dims and holds still, so what moved is the only thing moving.
 *
 * Two `Atlas` calls draw everything. The dots that stay are positioned once; the
 * dots that travel are positioned in a worklet off one shared sweep, so a
 * session's worth of dots is recomputed per frame rather than the whole
 * collection. The entrance is one `scaleY` on the enclosing group. One transform
 * for the whole field rather than N springs is what keeps this honest on a
 * frame-starved Android device.
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

const AXIS_LABEL_BASE_STYLE = {
  position: 'absolute' as const,
  top: 0,
};

const AXIS_TICKS = HORIZON_BAND_KEYS.map(key => {
  const fraction = getHorizonFraction(AXIS_TICK_DAYS[key]);
  return {
    key,
    label: HORIZON_BAND_LABELS[key],
    fraction,
    style:
      fraction >= 1
        ? { ...AXIS_LABEL_BASE_STYLE, right: LAYOUT.SPACING.MEDIUM }
        : { ...AXIS_LABEL_BASE_STYLE, left: fraction * BAND_WIDTH },
  };
});

const GROW_ORIGIN = vec(0, PLOT_HEIGHT);
const MEDIAN_DASH_INTERVALS = [3, 4];
const MEDIAN_TOP = vec(0, 0);
const MEDIAN_BOTTOM = vec(0, BAND_HEIGHT);

// Read into module-level primitives because the travel worklet captures them:
// the config object itself also carries easing functions, which have no
// business being copied to the UI thread for the sake of three numbers.
const TRAVEL_STAGGER = HORIZON_TRAVEL.STAGGER;
const TRAVEL_ARC_LIFT = HORIZON_TRAVEL.ARC_LIFT;
const TRAVEL_DIM_RAMP = HORIZON_TRAVEL.DIM_RAMP;
const REGROWN_AT = HORIZON_TRAVEL.REGROWN_AT;

/**
 * How far the dots that are NOT travelling step back while the others do. The
 * field keeps its one accent — what moved is picked out by the rest receding,
 * never by a second colour.
 */
const RESTING_FIELD_OPACITY = CHART_OPACITY.LOW;

const NO_MOVERS: DotMover[] = [];
const NO_BEATS: TravelHapticBeat[] = [];

interface MemoryHorizonBandProps {
  /** Practised-word count per column. Length is BIN_COUNT. */
  bins: readonly number[];
  /** Words each dot stands for — 1 unless the collection overflows a column. */
  wordsPerDot: number;
  /** 0..1 position of the median horizon; 0 when nothing is practised. */
  medianFraction: number;
  /** False when nothing has been practised: draw the empty axis only. */
  hasDistribution: boolean;
  /** Each practised word's horizon, so a change can be traced to its dots. */
  horizonByRootId: ReadonlyMap<RootId, number>;
}

interface FieldState {
  /** The field currently drawn. */
  field: DotField;
  /** Dots that are simply where they belong. */
  stayers: DotSlot[];
  /** Dots that travelled to get here; empty when the field was just drawn. */
  movers: DotMover[];
  /**
   * Travels adopted so far. Travel N plays as the sweep runs from N − 1 to N,
   * so a freshly adopted plan is already at its start — every dot where it was
   * — on the very frame it is committed, with no reset to race against.
   */
  travels: number;
  /** Redraws so far. The grow-from-baseline entrance plays once for each. */
  redraws: number;
  /** What the travel feels like as its dots land; empty when nothing is felt. */
  beats: TravelHapticBeat[];
  /** Whether this field was regrown in view, and so lands with a beat. */
  settlesOnRedraw: boolean;
}

/**
 * Decides HOW the field gets to each new distribution — by travelling or by
 * being redrawn — and hands the drawing to `HorizonBandCanvas`.
 *
 * Two components rather than one because of where the decision has to be made.
 * The field that was drawn must be remembered to plan a journey out of it, and
 * that is state adjusted during render (an effect would paint the new field
 * once before finding out it should have travelled there). A render that sets
 * state is thrown away and run again — and Skia's `useRSXformBuffer` starts a
 * UI-thread mapper while rendering that only an effect stops, so a discarded
 * render of the component that owns the buffers leaks its mappers for the life
 * of the process. This one owns no buffers, so its discarded render costs
 * nothing; the canvas below never sets state while rendering.
 */
function MemoryHorizonBandComponent({
  bins,
  wordsPerDot,
  medianFraction,
  hasDistribution,
  horizonByRootId,
}: MemoryHorizonBandProps): JSX.Element {
  const [fieldState, setFieldState] = useState<FieldState>(() => {
    const field: DotField = { bins, wordsPerDot, horizonByRootId };
    return {
      field,
      stayers: layOutDots(field),
      movers: NO_MOVERS,
      travels: 0,
      redraws: 0,
      beats: NO_BEATS,
      settlesOnRedraw: false,
    };
  });

  // A change is felt only if it is seen. The tab stays mounted under whatever
  // covers it, and the figures above this are held while it is covered — but
  // not before its first showing, when a field changing out of view would
  // otherwise tick away under another screen.
  const isFocused = useIsFocused();

  // The map's identity is the change signal — it is rebuilt only when the word
  // list is.
  if (fieldState.field.horizonByRootId !== horizonByRootId) {
    const field: DotField = { bins, wordsPerDot, horizonByRootId };
    const plan = planDotTravel(fieldState.field, field);
    setFieldState({
      field,
      stayers: plan?.stayers ?? layOutDots(field),
      movers: plan?.movers ?? NO_MOVERS,
      travels: fieldState.travels + (plan && plan.movers.length > 0 ? 1 : 0),
      redraws: fieldState.redraws + (plan ? 0 : 1),
      beats: plan && isFocused ? planTravelHaptics(plan.movers) : NO_BEATS,
      // A field that could not travel still arrived: a first session grows in
      // out of an empty axis, and a very large one is past MAX_MOVERS.
      settlesOnRedraw: !plan && isFocused && horizonByRootId.size > 0,
    });
  }

  return (
    <HorizonBandCanvas
      stayers={fieldState.stayers}
      movers={fieldState.movers}
      travels={fieldState.travels}
      redraws={fieldState.redraws}
      beats={fieldState.beats}
      settlesOnRedraw={fieldState.settlesOnRedraw}
      medianFraction={medianFraction}
      hasDistribution={hasDistribution}
    />
  );
}

interface HorizonBandCanvasProps {
  stayers: DotSlot[];
  movers: DotMover[];
  travels: number;
  redraws: number;
  beats: TravelHapticBeat[];
  settlesOnRedraw: boolean;
  medianFraction: number;
  hasDistribution: boolean;
}

function HorizonBandCanvasComponent({
  stayers,
  movers,
  travels,
  redraws,
  beats,
  settlesOnRedraw,
  medianFraction,
  hasDistribution,
}: HorizonBandCanvasProps): JSX.Element {
  const navigation = useNavigation();
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  // Fewer ticks keep the log axis readable when text grows. The data and
  // spoken band breakdown stay complete, and both endpoints still name the range.
  const axisTicks =
    width / fontScale < INLINE_VALUE_MIN_WIDTH
      ? AXIS_TICKS.filter(tick => tick.key === 'days' || tick.key === 'year')
      : AXIS_TICKS;
  const axisHeight = LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.LOOSE * fontScale;
  const axisStyle = StyleSheet.flatten([styles.axis, { height: axisHeight }]);
  // This component also needs the base card colour. Derive chart tokens from
  // the same palette rather than mounting a second theme subscription through
  // useChartColors().
  const chartColors = getChartColors(colors);

  // ZONE rather than the default TRACK (0.18 vs 0.16) because sepia's accent
  // clamps to a much lower chroma against warm paper, and at TRACK this rail
  // disappeared there — checked on device across all three themes. It is also
  // the only thing drawn before anything is practised, so it has to carry on its
  // own. Still a step off the card, never a second data colour, and never grey.
  const trackColor = getMeterTrackColor(colors.card, chartColors.ui.accent, CHART_OPACITY.ZONE);

  const stayerCount = stayers.length;
  const moverCount = movers.length;

  // A single dot, drawn once into a texture and stamped N times by Atlas. The
  // colour is baked in rather than passed per-instance because every dot in this
  // field is the same accent — one accent carries all data ink.
  const dotTexture = useTexture(
    <Circle c={vec(DOT_RADIUS, DOT_RADIUS)} r={DOT_RADIUS} color={chartColors.ui.dataLine} />,
    { width: DOT_TEXTURE_SIZE, height: DOT_TEXTURE_SIZE },
    [chartColors.ui.dataLine],
  );

  // The profiler showed this boundary rebuilding hundreds of dot/rect objects
  // during unrelated Practice renders. React Compiler did not optimize this
  // component in the measured build, so keep the geometry explicitly keyed to
  // the dots that can actually change it.
  const stayerSprites = useMemo<SkRect[]>(
    () => stayers.map(() => rect(0, 0, DOT_TEXTURE_SIZE, DOT_TEXTURE_SIZE)),
    [stayers],
  );
  const moverSprites = useMemo<SkRect[]>(
    () => movers.map(() => rect(0, 0, DOT_TEXTURE_SIZE, DOT_TEXTURE_SIZE)),
    [movers],
  );

  // Positions resolved on the UI thread. `set` takes (scos, ssin, tx, ty):
  // (1, 0) means no rotation and no scale, so each dot is only translated — and
  // Atlas places a sprite by its top-left corner, hence the radius offset.
  const stayerTransforms = useRSXformBuffer(stayerCount, (val, index) => {
    'worklet';
    const slot = stayers[index];
    if (!slot) {
      val.set(1, 0, 0, 0);
      return;
    }
    val.set(1, 0, slot.x - DOT_RADIUS, slot.y - DOT_RADIUS);
  });

  // One sweep for every travelling dot. See `FieldState.travels` for why it
  // runs between integers rather than being reset to zero.
  const travel = useSharedValue(0);

  useEffect(() => {
    if (travels === 0) return;
    travel.set(travels - 1);
    travel.set(withTiming(travels, HORIZON_TRAVEL.SWEEP));
  }, [travel, travels]);

  const moverTransforms = useRSXformBuffer(moverCount, (val, index) => {
    'worklet';
    const mover = movers[index];
    const from = mover?.from ?? mover?.to;
    const to = mover?.to ?? mover?.from;
    if (!mover || !from || !to) {
      val.set(0, 0, 0, 0);
      return;
    }

    // Each dot eases across its own slice of the sweep, offset by its place in
    // the departure order, so they leave as a stream rather than as a block.
    const sweep = Math.min(1, Math.max(0, travel.get() - (travels - 1)));
    const offset = departureShare(index, moverCount);
    const local = Math.min(1, Math.max(0, (sweep - offset) / (1 - TRAVEL_STAGGER)));
    const eased = local < 0.5 ? 4 * local * local * local : 1 - Math.pow(-2 * local + 2, 3) / 2;

    // An arc, not a slide: a dot that travelled along the baseline would plough
    // through every column between its old place and its new one.
    const lift = Math.sin(Math.PI * eased) * TRAVEL_ARC_LIFT;
    const x = from.x + (to.x - from.x) * eased;
    const y = Math.max(DOT_RADIUS, from.y + (to.y - from.y) * eased - lift);

    // A word with no dot before grows into its place; one with none after
    // shrinks out of it. Scaled about the centre, hence the scaled offset.
    const scale = mover.from === null ? eased : mover.to === null ? 1 - eased : 1;
    val.set(scale, 0, x - DOT_RADIUS * scale, y - DOT_RADIUS * scale);
  });

  // The rest of the field steps back for the length of the travel and returns
  // as the last dot lands.
  const restingOpacity = useDerivedValue(() => {
    'worklet';
    if (travels === 0) return 1;
    const sweep = Math.min(1, Math.max(0, travel.get() - (travels - 1)));
    const ramp = Math.min(1, sweep / TRAVEL_DIM_RAMP, (1 - sweep) / TRAVEL_DIM_RAMP);
    return 1 - (1 - RESTING_FIELD_OPACITY) * Math.max(0, ramp);
  });

  // The landings, felt. Fired off the sweep itself and never from a JS timer
  // started beside it: those are two clocks, and they drift under load (see
  // `VERDICT.HAPTIC_AT`). A frame that crosses several beats fires only the
  // last of them, so a starved device — or reduced motion, where the sweep
  // lands in one step — gets the closing beat at most, never a burst.
  function fireFocusedFeedback(shouldCommit: boolean): void {
    // Check when the queued RN callback runs: Practice may have been covered
    // since the animation crossed its beat, even before React renders the blur.
    if (!navigation.isFocused()) return;
    if (shouldCommit) commitFeedback();
    else selectionFeedback();
  }

  useAnimatedReaction(
    () => {
      'worklet';
      const sweep = Math.min(1, Math.max(0, travel.get() - (travels - 1)));
      let passed = 0;
      for (const beat of beats) {
        if (beat.at > sweep) break;
        passed += 1;
      }
      return passed;
    },
    (passed, previous) => {
      'worklet';
      if (previous === null || passed <= previous) return;
      // Tier 0 for a landing, the faintest thing available, because there can
      // be several a second. The close is the texture a recalled card commits
      // with: the session's own beat, once more, for the session as a whole.
      scheduleOnRN(fireFocusedFeedback, beats[passed - 1]?.settle === true);
    },
  );

  // Grow the whole field off the baseline as one transform.
  const growth = useSharedValue(0);
  const settle = useSharedValue(0);

  const medianX = medianFraction * BAND_WIDTH;
  const medianPosition = useSharedValue(medianX);

  // Plays on mount and again for every redraw — a field that could not travel
  // to its new shape grows into it instead.
  useEffect(() => {
    growth.set(0);
    settle.set(0);
    growth.set(withTiming(1, TIMING_CONFIG.PROGRESS));
    // The median rule annotates the shape, so it lands after the shape does —
    // the same settle idiom the vocabulary sparkline uses.
    settle.set(withDelay(TIMING_CONFIG.PROGRESS.duration, withTiming(1, TIMING_CONFIG.ENTRANCE)));
  }, [growth, settle, redraws]);

  // A regrown field lands with the same closing beat a travel does. Rising
  // edge only, and never for the entrance on mount, which reports nothing.
  useAnimatedReaction(
    () => {
      'worklet';
      return growth.get() >= REGROWN_AT;
    },
    (hasLanded, hadLanded) => {
      'worklet';
      if (settlesOnRedraw && hasLanded && hadLanded === false) {
        scheduleOnRN(fireFocusedFeedback, true);
      }
    },
  );

  // The rule slides with the dots: the typical word moved because they did. A
  // redrawn field is the exception — its rule fades in where it belongs, having
  // come from nowhere, so it is placed rather than slid.
  const placedForRedraw = useRef(redraws);
  useEffect(() => {
    if (placedForRedraw.current !== redraws) {
      placedForRedraw.current = redraws;
      medianPosition.set(medianX);
      return;
    }
    medianPosition.set(withTiming(medianX, HORIZON_TRAVEL.MEDIAN));
  }, [medianPosition, medianX, redraws]);

  const growTransform = useDerivedValue(() => {
    'worklet';
    return [{ scaleY: growth.get() }];
  });

  const medianTransform = useDerivedValue(() => {
    'worklet';
    return [{ translateX: medianPosition.get() }];
  });

  return (
    <View>
      <Canvas style={styles.canvas} pointerEvents="none">
        {/* The empty axis. Present from the first frame and never animated: a
            learner with nothing practised should meet a year of labelled runway,
            not a grey empty-state box. */}
        <Path path={TRACK_PATH} color={trackColor} />

        {hasDistribution && stayerCount + moverCount > 0 && (
          <Group transform={growTransform} origin={GROW_ORIGIN}>
            {stayerCount > 0 && (
              <Group opacity={restingOpacity}>
                <Atlas image={dotTexture} sprites={stayerSprites} transforms={stayerTransforms} />
              </Group>
            )}
            {moverCount > 0 && (
              <Atlas image={dotTexture} sprites={moverSprites} transforms={moverTransforms} />
            )}
          </Group>
        )}

        {/* Baseline anchors the stubs into one axis. */}
        <ChartBaseline width={BAND_WIDTH} y={PLOT_HEIGHT} color={chartColors.ui.grid} />

        {/* Median rule. Dashed because it is a rule, not a series — the same
            distinction the word-detail forgetting curve draws. */}
        {hasDistribution && medianFraction > 0 && (
          <Group opacity={settle} transform={medianTransform}>
            <Line
              p1={MEDIAN_TOP}
              p2={MEDIAN_BOTTOM}
              color={chartColors.ui.threshold}
              strokeWidth={1}
              style="stroke"
            >
              <DashPathEffect intervals={MEDIAN_DASH_INTERVALS} />
            </Line>
          </Group>
        )}
      </Canvas>

      {/* Labels are RN text over the canvas, never Skia text: only these honour
          Dynamic Type, the theme's own token, and the accessibility tree. The
          whole row is hidden from screen readers by the card that owns it. */}
      <View style={axisStyle} pointerEvents="none">
        {axisTicks.map(tick => (
          <ThemedText
            key={tick.key}
            type="caption"
            colorName="subtleLabelText"
            // A label marks where its band BEGINS, so it is left-aligned on the
            // tick — except the last, whose tick sits at the very right edge
            // (fraction 1.0 by definition) and which would otherwise render
            // entirely off-canvas.
            style={tick.style}
          >
            {tick.label}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const HorizonBandCanvas = memo(HorizonBandCanvasComponent);

export const MemoryHorizonBand = memo(MemoryHorizonBandComponent);

MemoryHorizonBand.displayName = 'MemoryHorizonBand';

const styles = StyleSheet.create({
  canvas: {
    height: BAND_HEIGHT,
    width: BAND_WIDTH,
  },
  axis: {
    marginTop: LAYOUT.SPACING.TINY,
  },
});
