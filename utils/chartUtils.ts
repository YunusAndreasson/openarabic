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

