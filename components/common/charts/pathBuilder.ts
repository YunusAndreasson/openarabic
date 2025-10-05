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
 * using cubic bezier interpolation with control points at 30% and 70%
 * of the distance between adjacent points.
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
export function buildSmoothChartPath<T, P>(
  options: BuildPathOptions<T, P>
): BuildPathResult<P> {
  const { data, dataPointPositions, calculateY, buildPoint } = options;

  const path = Skia.Path.Make();
  const points: P[] = [];

  data.forEach((item, index) => {
    const x = dataPointPositions[index] || 0;
    const y = calculateY(item, index);
    const point = buildPoint(x, y, item, index);
    points.push(point);

    if (index === 0) {
      // Start the path at the first point
      path.moveTo(x, y);
    } else {
      // Create smooth curve to current point using cubic bezier
      const prevPoint = points[index - 1] as { x: number; y: number };
      if (prevPoint) {
        // Control points at 30% and 70% create natural-looking curves
        const controlX1 = prevPoint.x + (x - prevPoint.x) * 0.3;
        const controlY1 = prevPoint.y;
        const controlX2 = prevPoint.x + (x - prevPoint.x) * 0.7;
        const controlY2 = y;
        path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
      }
    }
  });

  return {
    path: path.toSVGString(),
    points,
  };
}
