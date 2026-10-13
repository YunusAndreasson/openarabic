import {
  Canvas,
  Group,
  Path,
  Skia,
  usePathInterpolation,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
// Direct path, not the `charts` barrel: that barrel also re-exports
// `VocabularyChart`, and Metro does not tree-shake — importing it here
// would evaluate the whole line-chart stack on the practice tab's first
// render for a component that draws no line chart.
import { ChartBaseline } from '@/components/common/charts/ChartBaseline';
import { CHART_OPACITY, useChartColors } from '@/constants/chartColors';
import { appendRoundedTopBar, BAR_TOP_RADIUS } from '@/utils/barChartPath';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Seven columns: how many words come up for review on each of the next seven
 * days, today leftmost.
 *
 * Bars rather than the sheet's smoothed line, deliberately. At ~50pt tall a
 * seven-point spline is nearly straight and says nothing, and the smoothing
 * implies values between days that do not exist — a review count is a discrete
 * per-day fact. The column shape is the one the streak chart already uses, so
 * the app keeps a single bar vocabulary.
 *
 * The shape MORPHS between datasets rather than snapping, via
 * `usePathInterpolation`. That hook validates `isInterpolatable` on every render
 * and THROWS rather than warning, so `buildWeekPath` is written to emit an
 * identical verb sequence for every possible input, and the call site guards
 * once more before handing the pair over.
 */

/**
 * A sparkbar, not a chart: it rides inside a row beside the headline it
 * qualifies. Fixed, modest size — the labelled, interrogable version of this
 * same series lives in the /due-words sheet, which is what the row taps into.
 */
const CHART_WIDTH = 96;
const CHART_HEIGHT = 28;

const DAYS = 7;
const BAR_GAP = 3;
const BAR_WIDTH = (CHART_WIDTH - (DAYS - 1) * BAR_GAP) / DAYS;
/** Minimum vertical scale, so a single due word does not fill the canvas. */
const MIN_SCALE = 4;

/**
 * All seven columns as one path.
 *
 * Two invariants keep `usePathInterpolation` from throwing:
 *   1. always exactly DAYS columns, even empty ones;
 *   2. always the same seven verbs per column — a zero-count day emits them
 *      degenerately on the baseline rather than branching to a shorter form.
 *
 * The second one is now held by `appendRoundedTopBar` having a single code path
 * rather than by this loop remembering not to add an early return.
 */
function buildWeekPath(counts: readonly number[], scale: number): SkPath {
  const builder = Skia.PathBuilder.Make();
  const safeScale = Math.max(1, scale);

  for (let index = 0; index < DAYS; index++) {
    const count = counts[index] ?? 0;
    const height =
      count <= 0 ? 0 : Math.max(BAR_TOP_RADIUS * 2, (count / safeScale) * CHART_HEIGHT);

    appendRoundedTopBar(builder, {
      x: index * (BAR_WIDTH + BAR_GAP),
      width: BAR_WIDTH,
      height,
      baseline: CHART_HEIGHT,
    });
  }

  return builder.build();
}

const scaleFor = (counts: readonly number[]): number =>
  Math.max(MIN_SCALE, ...counts.map(count => count || 0));

/** Only day 0 drawn, so today can be painted solid over the projection. */
const todayOnly = (counts: readonly number[]): number[] =>
  counts.map((count, index) => (index === 0 ? count : 0));

type PathPair = [SkPath, SkPath];

const MORPH_RANGE = [0, 1];

/** The whole week and today's column alone, on one shared vertical scale. */
function buildPaths(counts: readonly number[]): { week: SkPath; today: SkPath } {
  const scale = scaleFor(counts);
  return {
    week: buildWeekPath(counts, scale),
    today: buildWeekPath(todayOnly(counts), scale),
  };
}

/**
 * Belt and braces. Even with a fixed verb sequence, an unexpected build must
 * degrade to "no morph" rather than throw on the app's most-visited screen.
 */
const interpolatable = (pair: PathPair): PathPair =>
  pair[0].isInterpolatable(pair[1]) ? pair : [pair[1], pair[1]];

interface WeekAheadBarsProps {
  /** Due-word count per day, today first. Length 7. */
  counts: readonly number[];
}

export function WeekAheadBars({ counts }: WeekAheadBarsProps): JSX.Element {
  const chartColors = useChartColors();

  // A primitive signature, because every path object is a fresh identity: an
  // effect keyed on the path itself would set state, re-render, build a new
  // path, and fire again forever.
  const signature = counts.join(',');

  // Adjusted during render rather than in an effect. `usePathInterpolation`
  // stores `outputRange` in a `useAnimatedReaction` dependency array, so the
  // pair has to keep a stable identity between data changes — and a fresh
  // object each render would re-register the reaction every frame. React
  // Compiler memoization is an optimisation, not a stability guarantee, so this
  // is one of the few places that cannot lean on it.
  //
  // This is React's own "adjusting state when props change" pattern: a
  // render-phase update on this component, which re-renders before anything
  // paints. Doing the same work in an effect would set state after paint and
  // cascade an extra render.
  const [pathState, setPathState] = useState(() => {
    const paths = buildPaths(counts);
    return {
      signature,
      week: [paths.week, paths.week] as PathPair,
      today: [paths.today, paths.today] as PathPair,
    };
  });
  const morph = useSharedValue(1);

  if (pathState.signature !== signature) {
    const paths = buildPaths(counts);
    setPathState({
      signature,
      week: [pathState.week[1], paths.week],
      today: [pathState.today[1], paths.today],
    });
  }

  // The count's own duration, so the numeral beside these bars and the bar that
  // IS that numeral finish together.
  useEffect(() => {
    morph.set(0);
    morph.set(withTiming(1, TIMING_CONFIG.COUNT));
  }, [signature, morph]);

  const morphedPath = usePathInterpolation(morph, MORPH_RANGE, interpolatable(pathState.week));
  // Today's column morphs with the rest. It used to be rebuilt from the current
  // counts on every render, so the solid bar — the due count itself, drawn —
  // snapped to its new height while the week around it eased there.
  const todayPath = usePathInterpolation(morph, MORPH_RANGE, interpolatable(pathState.today));

  // Entrance grows the row off the baseline as one transform, offset from the
  // recall chart so the two never start animating on the same frame.
  const growth = useSharedValue(0);
  useEffect(() => {
    growth.set(0);
    growth.set(withDelay(TIMING_CONSTANTS.STAGGER.BASE, withTiming(1, TIMING_CONFIG.PROGRESS)));
  }, [growth]);

  const growTransform = useDerivedValue(() => {
    'worklet';
    return [{ scaleY: growth.get() }];
  });

  return (
    <View>
      <Canvas style={styles.canvas} pointerEvents="none">
        <Group transform={growTransform} origin={vec(0, CHART_HEIGHT)}>
          {/* Today is measured; the rest is a projection. Two levels of the one
              accent, never a ramp — the same distinction the shared chart stack
              makes with its emphasised endpoint. */}
          <Path
            path={morphedPath}
            color={withOpacity(chartColors.ui.dataLine, CHART_OPACITY.MEDIUM)}
          />
          <Path path={todayPath} color={chartColors.ui.dataLine} />
        </Group>

        {/* Baseline, so a fully caught-up week still reads as a chart rather
            than as a blank rectangle. */}
        <ChartBaseline width={CHART_WIDTH} y={CHART_HEIGHT} color={chartColors.ui.grid} />
      </Canvas>
    </View>
  );
}

WeekAheadBars.displayName = 'WeekAheadBars';

const styles = StyleSheet.create({
  canvas: {
    height: CHART_HEIGHT,
    width: CHART_WIDTH,
  },
});
