/**
 * Interface for chart data points with date information
 */
export interface ChartPoint {
  x: number;
  y: number;
  date: Date;
  rate?: number; // For milestones
}

/**
 * Generates unique keys for data points using their date
 * @param dataPoints - Array of chart data points
 * @param prefix - Prefix for the generated keys (default: 'data-point')
 * @returns Array of unique keys for each data point
 */
export const generateDataPointKeys = (
  dataPoints: ChartPoint[],
  prefix: string = 'data-point'
): string[] => {
  return dataPoints.map((point: ChartPoint) => `${prefix}-${point.date.toISOString()}`);
};

/**
 * Generates unique keys for milestone points using their date and rate or index
 * @param milestones - Array of milestone chart points
 * @param prefix - Prefix for the generated keys (default: 'milestone')
 * @returns Array of unique keys for each milestone
 */
export const generateMilestoneKeys = (
  milestones: ChartPoint[],
  prefix: string = 'milestone'
): string[] => {
  return milestones.map((milestone: ChartPoint, index: number) => {
    const keyIdentifier =
      'rate' in milestone && milestone.rate !== undefined ? milestone.rate : index;
    return `${prefix}-${milestone.date.toISOString()}-${keyIdentifier}`;
  });
};

/**
 * Generates unique keys for any chart points with custom identifier
 * @param points - Array of chart points
 * @param prefix - Prefix for the generated keys
 * @param identifierFn - Function to generate unique identifier for each point
 * @returns Array of unique keys for each point
 */
export const generateChartPointKeys = <T extends ChartPoint>(
  points: T[],
  prefix: string,
  identifierFn: (point: T, index: number) => string | number
): string[] => {
  return points.map((point: T, index: number) => {
    const identifier = identifierFn(point, index);
    return `${prefix}-${point.date.toISOString()}-${identifier}`;
  });
};

/**
 * Validates that chart data points have valid dates
 * @param dataPoints - Array of chart data points to validate
 * @returns True if all points have valid dates, false otherwise
 */
export const validateChartDataPoints = (dataPoints: ChartPoint[]): boolean => {
  return dataPoints.every(point => point.date instanceof Date && !isNaN(point.date.getTime()));
};

/**
 * Sorts chart data points by date in ascending order
 * @param dataPoints - Array of chart data points to sort
 * @returns New array with sorted data points
 */
export const sortChartDataPointsByDate = (dataPoints: ChartPoint[]): ChartPoint[] => {
  return [...dataPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
};

/**
 * Filters chart data points within a date range
 * @param dataPoints - Array of chart data points to filter
 * @param startDate - Start date for the range (inclusive)
 * @param endDate - End date for the range (inclusive)
 * @returns Array of data points within the specified date range
 */
export const filterChartDataPointsByDateRange = (
  dataPoints: ChartPoint[],
  startDate: Date,
  endDate: Date
): ChartPoint[] => {
  return dataPoints.filter(point => {
    const pointTime = point.date.getTime();
    return pointTime >= startDate.getTime() && pointTime <= endDate.getTime();
  });
};

/**
 * Calculates the date range of chart data points
 * @param dataPoints - Array of chart data points
 * @returns Object with min and max dates, or null if no data points
 */
export const calculateChartDateRange = (
  dataPoints: ChartPoint[]
): { minDate: Date; maxDate: Date } | null => {
  if (dataPoints.length === 0) {
    return null;
  }

  const sortedPoints = sortChartDataPointsByDate(dataPoints);
  if (sortedPoints.length === 0) {
    return null;
  }
  const firstPoint = sortedPoints[0];
  const lastPoint = sortedPoints[sortedPoints.length - 1];

  if (!firstPoint || !lastPoint) {
    return null;
  }

  return {
    minDate: firstPoint.date,
    maxDate: lastPoint.date,
  };
};

/**
 * Ensures unique keys by appending a counter if duplicates are found
 * @param keys - Array of keys to ensure uniqueness
 * @returns Array of unique keys
 */
export const ensureUniqueKeys = (keys: string[]): string[] => {
  const seen = new Set<string>();
  return keys.map(key => {
    let uniqueKey = key;
    let counter = 1;

    while (seen.has(uniqueKey)) {
      uniqueKey = `${key}-${counter}`;
      counter++;
    }

    seen.add(uniqueKey);
    return uniqueKey;
  });
};
