import { Canvas, Group, Path, Skia, vec, type SkPath } from 'react-native-skia';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { I18nManager, View } from 'react-native';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
// Direct paths rather than through a barrel: these are the only chart parts the
// practice canvases share, and they are all they need.
import { ChartBaseline } from '@/components/common/charts/ChartBaseline';
import { useBaselineGrowth } from '@/components/common/charts/useBaselineGrowth';
import { CHART_OPACITY, useChartColors } from '@/constants/chartColors';
import { appendRoundedTopBar, BAR_TOP_RADIUS, columnGeometry } from '@/utils/barChartPath';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Seven columns, starting with what is due now, then what each of the next
 * six days ADDS.
 *
 * Per-day, not cumulative. The series used to be the running backlog — every
 * word due by the end of each day — which can only rise, so the week always
 * read as a mounting pile with its peak on the last day whatever the learner's
 * schedule actually held. The first column is still the whole backlog, because
 * that is what is waiting now; every later column is only what lands that day.
 *
 * Bars rather than a smoothed line, deliberately. A spline implies values
 * between days that do not exist — a review count is a discrete per-day fact —
 * and at sparkbar size a seven-point spline is nearly straight and says nothing.
 * The column shape is the one the streak chart uses, so the app keeps a single
 * bar vocabulary.
 *
 * Two sizes, one drawing: the sparkbar inside the practice screen's due card,
 * and the labelled version the /due-words sheet draws at full width. Both pass
 * the same series, so the card and the sheet it opens cannot disagree.
 *
 * The shape morphs between datasets. Each input generates an identical path
 * verb sequence so the shapes can interpolate.
 */

const DAYS = 7;
/** Minimum vertical scale, so a single due word does not fill the canvas. */
const MIN_SCALE = 4;

/**
 * The sparkbar: it rides inside a row beside the headline it qualifies, so it
 * is a fixed, modest size.
 */
const SPARK_WIDTH = 96;
const SPARK_HEIGHT = 28;
const SPARK_GAP = 3;

interface WeekBarGeometry {
  width: number;
  height: number;
  gap: number;
}

/**
 * All seven columns as one path.
 *
 * Two invariants keep `usePathInterpolation` from throwing:
 *   1. always exactly DAYS columns, even empty ones;
 *   2. always the same seven verbs per column — a zero-count day emits them
 *      degenerately on the baseline rather than branching to a shorter form.
 *
 * The second one is held by `appendRoundedTopBar` having a single code path
 * rather than by this loop remembering not to add an early return.
 */
function buildWeekPath(
  counts: readonly number[],
  scale: number,
  geometry: WeekBarGeometry,
): SkPath {
  const builder = Skia.PathBuilder.Make();
  const safeScale = Math.max(1, scale);
  const { barWidth, pitch } = columnGeometry(geometry.width, DAYS, geometry.gap);

  for (let index = 0; index < DAYS; index++) {
    const count = counts[index] ?? 0;
    const height =
      count <= 0 ? 0 : Math.max(BAR_TOP_RADIUS * 2, (count / safeScale) * geometry.height);

    appendRoundedTopBar(builder, {
      x: index * pitch,
      width: barWidth,
      height,
      baseline: geometry.height,
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

/** The whole week and today's column alone, on one shared vertical scale. */
function buildPaths(
  counts: readonly number[],
  geometry: WeekBarGeometry,
): { week: SkPath; today: SkPath } {
  const scale = scaleFor(counts);
  return {
    week: buildWeekPath(counts, scale, geometry),
    today: buildWeekPath(todayOnly(counts), scale, geometry),
  };
}

/** Skia weights the receiver, so one is the newest geometry. */
function morphBars([previous, next]: PathPair, progress: number): SkPath {
  'worklet';
  if (progress >= 1 || previous === next) return next;
  return next.interpolate(previous, progress) ?? next;
}

interface WeekAheadBarsProps {
  /** Per-day counts, today first: due now, then what each later day adds. Length 7. */
  counts: readonly number[];
  /** Canvas width. Defaults to the sparkbar's. */
  width?: number;
  /** Canvas height. Defaults to the sparkbar's. */
  height?: number;
  /**
   * Space between columns. A caller laying labels under the bars gives its
   * label row this same gap, so each label sits under its own column.
   */
  gap?: number;
}

export function WeekAheadBars({
  counts,
  width = SPARK_WIDTH,
  height = SPARK_HEIGHT,
  gap = SPARK_GAP,
}: WeekAheadBarsProps): JSX.Element {
  const chartColors = useChartColors();
  const geometry: WeekBarGeometry = { width, height, gap };

  // A primitive signature, because every path object is a fresh identity: an
  // effect keyed on the path itself would set state, re-render, build a new
  // path, and fire again forever. The geometry is part of it, so a resized
  // canvas rebuilds rather than morphing between two sizes.
  const signature = `${counts.join(',')}|${width}x${height}+${gap}`;

  // This is React's own "adjusting state when props change" pattern: a
  // render-phase update on this component, which re-renders before anything
  // paints. Doing the same work in an effect would set state after paint and
  // cascade an extra render.
  const [pathState, setPathState] = useState(() => {
    const paths = buildPaths(counts, geometry);
    return {
      signature,
      week: [paths.week, paths.week] as PathPair,
      today: [paths.today, paths.today] as PathPair,
    };
  });
  const morph = useSharedValue(1);

  if (pathState.signature !== signature) {
    const paths = buildPaths(counts, geometry);
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

  const { week, today } = pathState;
  const morphedPath = useDerivedValue(() => morphBars(week, morph.get()));
  // Today's column morphs with the rest. It used to be rebuilt from the current
  // counts on every render, so the solid bar — the due count itself, drawn —
  // snapped to its new height while the week around it eased there.
  const todayPath = useDerivedValue(() => morphBars(today, morph.get()));

  // Entrance grows the row off the baseline as one transform, once, offset
  // from the recall chart so the two never start animating on the same frame.
  const growTransform = useBaselineGrowth(undefined, TIMING_CONSTANTS.STAGGER.BASE);

  return (
    <View>
      <Canvas
        style={{ width, height, transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
        pointerEvents="none"
      >
        <Group transform={growTransform} origin={vec(0, height)}>
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
        <ChartBaseline width={width} y={height} color={chartColors.ui.grid} />
      </Canvas>
    </View>
  );
}

WeekAheadBars.displayName = 'WeekAheadBars';
