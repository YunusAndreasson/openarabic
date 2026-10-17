import { Skia } from 'react-native-skia';

/**
 * Options for building a smooth chart path with cubic bezier curves
 */
export interface BuildPathOptions<T, P> {
  /** Array of data items to plot */
  data: T[];
  /** Pre-calculated x-coordinates for each data point */
  dataPointPositions: number[];
  /** Function to calculate y-coordinate for a data item */
  calculateY: (item: T, index: number) => number;
  /** Function to build point metadata (x, y, and item-specific data) */
  buildPoint: (x: number, y: number, item: T, index: number) => P;
}

/**
 * Result of building a chart path
 */
export interface BuildPathResult<P> {
  /** SVG path string for rendering */
  path: string;
  /** Array of chart points with metadata */
  points: P[];
}

/**
 * Build a smooth chart path using cubic bezier curves.
 *
 * This utility creates natural-looking smooth curves between data points by
 * deriving control points from neighbouring slopes, then clamping each
 * segment's control points into that segment's own y-range.
 *
 * The clamp is load-bearing, not cosmetic. Averaging neighbour slopes places
 * control points outside the segment at every local extremum, and a cubic
 * bezier follows its control polygon — so a plateau next to a steep step used
 * to bulge above the higher point and below the lower one. On the practice
 * hero sparkline (8px top / 6px bottom padding) that overshoot ran past the
 * canvas and Skia clipped it flat at BOTH edges. It also drew curves that
 * contradict the data: the cumulative "words in practice" line would dip
 * before a rise and spike after it, though the count only ever goes up.
 *
 * A bezier is contained in the convex hull of its control points, so clamping
 * the control y-values into [min(y0,y1), max(y0,y1)] guarantees the curve
 * never leaves the range spanned by the two points it connects.
 *
 * Ensures:
 * - Smooth curves that pass through all data points
 * - No artificial spikes or "edgy" transitions around points
 * - No overshoot past a data point, in either direction
 *
 * @param options - Configuration for path building
 * @returns SVG path string and array of points with metadata
 *
 * @example
 * ```ts
 * const { path, points } = buildSmoothChartPath({
 *   data: efficiencyData,
 *   dataPointPositions: calculateDataPointPositions(efficiencyData.length),
 *   calculateY: (item) => GRAPH_HEIGHT - (item.value / maxValue) * GRAPH_HEIGHT,
 *   buildPoint: (x, y, item) => ({ x, y, value: item.value, date: item.date }),
 * });
 * ```
 */
export function buildSmoothChartPath<T, P>(options: BuildPathOptions<T, P>): BuildPathResult<P> {
  const { data, dataPointPositions, calculateY, buildPoint } = options;

  const builder = Skia.PathBuilder.Make();
  const points: P[] = [];

  // First pass: build all points
  data.forEach((item, index) => {
    const x = dataPointPositions[index] || 0;
    const y = calculateY(item, index);
    const point = buildPoint(x, y, item, index);
    points.push(point);
  });

  // Second pass: create smooth curves with proper control points
  points.forEach((point, index) => {
    const { x, y } = point as { x: number; y: number };

    if (index === 0) {
      // Start the path at the first point
      builder.moveTo(x, y);
    } else {
      const prevPoint = points[index - 1] as { x: number; y: number };
      const nextPoint = points[index + 1] as { x: number; y: number } | undefined;

      // Calculate slopes for smooth transitions
      // Use neighboring points to determine the curve direction
      let prevSlope = 0;
      let currentSlope = 0;

      if (index > 0) {
        currentSlope = (y - prevPoint.y) / (x - prevPoint.x);
      }

      if (nextPoint) {
        const nextSlope = (nextPoint.y - y) / (nextPoint.x - x);
        // Average the slopes for smoother transitions
        currentSlope = (currentSlope + nextSlope) / 2;
      }

      if (index > 1) {
        const prevPrevPoint = points[index - 2] as { x: number; y: number };
        prevSlope = (prevPoint.y - prevPrevPoint.y) / (prevPoint.x - prevPrevPoint.x);
        if (index > 0) {
          const midSlope = (y - prevPrevPoint.y) / (x - prevPrevPoint.x);
          prevSlope = (prevSlope + midSlope) / 2;
        }
      } else {
        prevSlope = currentSlope;
      }

      // Calculate control points using slopes for smooth curves
      const tension = 0.3; // Tension factor for curve smoothness (lower = smoother)
      const controlX1 = prevPoint.x + (x - prevPoint.x) * tension;
      const controlX2 = x - (x - prevPoint.x) * tension;

      // Clamp the control y-values into this segment's own range. See the
      // header comment: without this the curve overshoots past the data at
      // every local extremum and gets clipped by the canvas edges.
      const minY = Math.min(prevPoint.y, y);
      const maxY = Math.max(prevPoint.y, y);
      const clampY = (value: number): number => Math.min(maxY, Math.max(minY, value));

      const controlY1 = clampY(prevPoint.y + prevSlope * (x - prevPoint.x) * tension);
      const controlY2 = clampY(y - currentSlope * (x - prevPoint.x) * tension);

      builder.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
    }
  });

  return {
    path: builder.build().toSVGString(),
    points,
  };
}
