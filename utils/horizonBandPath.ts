import { Skia, type SkPath } from 'react-native-skia';

import { LAYOUT, SCREEN_HEIGHT, SCREEN_WIDTH } from '@/constants/layout';
import { columnGeometry } from '@/utils/barChartPath';
import { getHorizonFraction } from '@/utils/memoryHorizon';

/**
 * Geometry for the practice screen's memory constellation, and the pure path
 * builders that draw its static parts.
 *
 * Separated from the component so the maths is testable without a Skia surface,
 * and so the dot layer and the solid-column fallback are guaranteed to be laid
 * out on exactly the same grid.
 */

/** Full card width, matching the other full-bleed practice canvases. */
export const BAND_WIDTH = SCREEN_WIDTH - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;

/**
 * One coarse breakpoint. A taller phone gets a taller canvas so more of a column
 * fits before dots start representing more than one word; nothing else responds
 * to screen size, because device-dependent chart geometry is how the sparkline
 * path builder acquired its clipping bug.
 */
const TALL_SCREEN_MIN_HEIGHT = 800;

/**
 * Deliberately large: this is the screen's hero, and the space is otherwise
 * dead air above the pinned CTA.
 *
 * Height is not just presence — it is fidelity. A taller canvas fits more dots
 * per column, so `getWordsPerDot` stays closer to 1 and the unit chart keeps its
 * unit for longer. At 96pt a 1200-word collection needed 19 words per dot; at
 * 190 it needs about half that.
 */
export const BAND_HEIGHT = SCREEN_HEIGHT >= TALL_SCREEN_MIN_HEIGHT ? 190 : 130;

/** Room under the baseline for the median rule's stem. */
const BASELINE_INSET = 10;
export const PLOT_HEIGHT = BAND_HEIGHT - BASELINE_INSET;

const MIN_BIN_COUNT = 16;
const MAX_BIN_COUNT = 32;
const TARGET_BIN_PITCH = 11;

/**
 * Number of columns along the log-time axis.
 *
 * Fixed for a given screen, never data-driven: the fallback column path is fed
 * to `usePathInterpolation`, which throws unless both paths carry the same verb
 * sequence, and a varying column count is the easiest way to break that.
 */
export const BIN_COUNT = Math.min(
  MAX_BIN_COUNT,
  Math.max(MIN_BIN_COUNT, Math.round(BAND_WIDTH / TARGET_BIN_PITCH)),
);
export const BIN_GAP = 3;
const BIN_COLUMNS = columnGeometry(BAND_WIDTH, BIN_COUNT, BIN_GAP);
export const BIN_WIDTH = BIN_COLUMNS.barWidth;

/**
 * Which column a horizon of `days` falls in.
 *
 * `min` guards the top of the range: a word at exactly maximumInterval scores
 * a fraction of 1 and would otherwise index one past the last column. The one
 * place this is decided, so the distribution that counts a column and the
 * travel plan that moves a dot between columns can never disagree about where
 * a word sits.
 */
export function getHorizonBinIndex(days: number): number {
  return Math.min(BIN_COUNT - 1, Math.floor(getHorizonFraction(days) * BIN_COUNT));
}

/** Left edge of column `index`. */
export function binX(index: number): number {
  return index * BIN_COLUMNS.pitch;
}

// ---------------------------------------------------------------------------
// Dot layer
// ---------------------------------------------------------------------------

/**
 * Quantised to half-points so the texture below comes out to a whole number of
 * pixels — a fractional texture size resamples and the dots go soft.
 */
export const DOT_RADIUS = Math.max(1.5, Math.min(3.5, Math.floor(BIN_WIDTH - 1) / 2));

/** Square texture holding exactly one dot, stamped N times by Atlas. */
export const DOT_TEXTURE_SIZE = DOT_RADIUS * 2;

const DOT_PITCH = DOT_RADIUS * 2 + 1;

/**
 * How many dots fit in the tallest column before one dot has to stand for more
 * than one word.
 */
export const DOT_COLUMN_CAP = Math.max(1, Math.floor(PLOT_HEIGHT / DOT_PITCH));

/**
 * Words per dot. 1 until a column would overflow, then whatever integer keeps
 * the tallest column inside the canvas.
 *
 * Callers MUST surface this when it is above 1 — silently re-scaling a unit
 * chart turns "count the dots" from a true instruction into a false one.
 */
export function getWordsPerDot(maxBinCount: number): number {
  if (maxBinCount <= DOT_COLUMN_CAP) return 1;
  return Math.ceil(maxBinCount / DOT_COLUMN_CAP);
}

/** Centre of the `depth`-th dot (0 = bottom) in a column. */
export function dotCenter(binIndex: number, depth: number): { x: number; y: number } {
  return {
    x: binX(binIndex) + BIN_WIDTH / 2,
    y: PLOT_HEIGHT - DOT_RADIUS - depth * DOT_PITCH,
  };
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/**
 * 3, not 2. Measured on device: a 2pt stub at the track's low opacity was
 * effectively invisible on the sepia theme — whose accent clamps to a much
 * lower chroma against warm paper — and the track is the ONLY thing drawn for a
 * learner who has not practised anything yet. An invisible stage turns that
 * state back into the blank box it exists to avoid.
 */
const STUB_HEIGHT = 3;

/**
 * The empty axis: one short stub per column, built once at module level.
 *
 * It is the stage, not data — present from the first frame and never animated,
 * so a learner with nothing practised still sees a year of labelled runway
 * rather than a grey empty-state box.
 */
export const TRACK_PATH: SkPath = (() => {
  const builder = Skia.PathBuilder.Make();
  for (let index = 0; index < BIN_COUNT; index++) {
    const x = binX(index);
    builder.addRect({
      x,
      y: PLOT_HEIGHT - STUB_HEIGHT,
      width: BIN_WIDTH,
      height: STUB_HEIGHT,
    });
  }
  return builder.build();
})();
