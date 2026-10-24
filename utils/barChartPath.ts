import type { SkPathBuilder } from 'react-native-skia';

/**
 * Rounded-top bar geometry, shared by the bar charts in the app.
 *
 * The week-ahead bars (card and sheet) and the 40-day streak chart draw the
 * same column:
 * square on the baseline, rounded where the data ends. They had each written the
 * seven verbs out — `moveTo → lineTo → quadTo → lineTo → quadTo → lineTo →
 * close` — with their own copy of the corner radius and their own clamp.
 *
 * Folding them is not about the lines saved. `WeekAheadBars` depends on every
 * column emitting the SAME verb sequence, because `usePathInterpolation` throws
 * when two paths disagree, and that invariant was held by a comment asking the
 * next editor not to add an early return for empty days. A shared emitter makes
 * it structural: there is one code path, so there is one verb sequence.
 */

/** Quadratic corner approximation — indistinguishable from an arc at ~6px widths. */
export const BAR_TOP_RADIUS = 3;

/** Equal columns laid across a width with a fixed gap between them. */
export interface ColumnGeometry {
  /** One column's width. */
  barWidth: number;
  /** One column's left edge to the next: a column plus the gap after it. */
  pitch: number;
  /** The width the columns actually span — wider than asked when `minBarWidth` won. */
  span: number;
}

/**
 * `count` columns filling `width`, `gap` apart. Column `index` starts at
 * `index × pitch`.
 *
 * The week-ahead bars, the streak chart and the memory constellation's grid
 * each worked this out by hand. `minBarWidth` floors a column for a chart that
 * has to stay legible when crowded (the streak chart's forty days), at the cost
 * of spanning wider than `width`.
 */
export function columnGeometry(
  width: number,
  count: number,
  gap: number,
  minBarWidth = 0,
): ColumnGeometry {
  if (count <= 0) {
    return { barWidth: 0, pitch: gap, span: 0 };
  }
  const barWidth = Math.max(minBarWidth, (width - (count - 1) * gap) / count);
  return { barWidth, pitch: barWidth + gap, span: count * barWidth + (count - 1) * gap };
}

interface BarGeometry {
  /** Left edge. */
  x: number;
  width: number;
  /** Drawn height above the baseline. May be 0 — the verbs are emitted anyway. */
  height: number;
  /** y of the baseline the bar stands on. */
  baseline: number;
  radius?: number;
}

/**
 * Append one column to `builder`.
 *
 * The radius is clamped by height as well as by width. Only the streak chart
 * needed that — its inactive days are stubs shorter than the radius, which
 * without the clamp bulge outward instead of reading as a flat marker — but it
 * is a no-op for a caller that already floors its bars at `2 × radius`, so the
 * safer of the two originals is the one that survives.
 */
export function appendRoundedTopBar(
  builder: SkPathBuilder,
  { x, width, height, baseline, radius = BAR_TOP_RADIUS }: BarGeometry,
): SkPathBuilder {
  const corner = Math.min(radius, width / 2, height);
  const top = baseline - height;

  return builder
    .moveTo(x, baseline)
    .lineTo(x, top + corner)
    .quadTo(x, top, x + corner, top)
    .lineTo(x + width - corner, top)
    .quadTo(x + width, top, x + width, top + corner)
    .lineTo(x + width, baseline)
    .close();
}
