import { Y_AXIS_LINES } from '@/constants/chartConstants';

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

/**
 * Steps a count axis may climb in, before scaling by a power of ten. Dense on
 * purpose: with a jump from 5 straight to 10, a peak just past a boundary (21,
 * 201, 2,001) doubled the axis and the line used half the chart.
 */
const AXIS_STEP_MULTIPLES = [1, 2, 3, 4, 5, 6, 8, 10] as const;

/**
 * Rounds a count axis up so its gridlines land on numbers a person would have
 * picked.
 *
 * An axis that tops out at the data's own maximum labels its quarter-lines with
 * whatever that maximum divides into — a 1,967-word backlog drew "492 · 984 ·
 * 1475 · 1967". The line and its labels must share this value: scale the path
 * to one and label with another and every point sits beside the wrong number.
 *
 * @param maxValue - Largest value the axis has to hold
 * @param gridlines - Lines the axis draws, the zero line included
 */
export function getNiceAxisMax(maxValue: number, gridlines: number = Y_AXIS_LINES): number {
  const intervals = gridlines - 1;
  if (!(maxValue > 0)) return intervals;

  const rawStep = maxValue / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const multiple = AXIS_STEP_MULTIPLES.find(m => m * magnitude >= rawStep) ?? 10;

  // A step below one would label a count axis with fractions.
  return Math.max(1, multiple * magnitude) * intervals;
}
