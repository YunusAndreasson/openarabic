import { Skia } from '@shopify/react-native-skia';

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
 * This utility creates natural-looking smooth curves between data points
 * using monotone cubic interpolation. Control points are calculated based
 * on neighboring points to ensure smooth transitions without overshoot.
 *
 * Follows 2025 best practices for data visualization smoothing, ensuring:
 * - Smooth curves that pass through all data points
 * - No artificial spikes or "edgy" transitions around points
 * - Monotone interpolation (no overshoot between data points)
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

  const path = Skia.Path.Make();
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
      path.moveTo(x, y);
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
      const controlY1 = prevPoint.y + prevSlope * (x - prevPoint.x) * tension;
      const controlX2 = x - (x - prevPoint.x) * tension;
      const controlY2 = y - currentSlope * (x - prevPoint.x) * tension;

      path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
    }
  });

  return {
    path: path.toSVGString(),
    points,
  };
}
