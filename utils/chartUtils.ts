/**
 * Interface for chart data points with date information
 */
export interface ChartPoint {
  x: number;
  y: number;
  date: Date;
}

/**
 * Generates unique keys for data points using their date
 * @param dataPoints - Array of chart data points
 * @param prefix - Prefix for the generated keys (default: 'data-point')
 * @returns Array of unique keys for each data point
 */
export const generateDataPointKeys = (
  dataPoints: ChartPoint[],
  prefix: string = 'data-point',
): string[] => {
  return dataPoints.map((point: ChartPoint) => `${prefix}-${point.date.toISOString()}`);
};
