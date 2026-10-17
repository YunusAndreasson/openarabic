import { useWindowDimensions } from 'react-native';

import { GOLDEN_RATIO, LAYOUT } from '@/constants/layout';

// Graph dimensions - optimized for perfect alignment and space usage with golden ratio
// Slightly increase to introduce subtle horizontal breathing room for the whole graph
const X_AXIS_LABEL_PADDING = 8; // Reduced from 12 for tighter spacing

/**
 * The plot width for a window of `windowWidth`. A function of the live width,
 * not a launch-time constant: on Android 16 a large screen ignores the portrait
 * lock, so a tablet rotates and a foldable unfolds under a running app.
 */
const graphWidthFor = (windowWidth: number): number =>
  windowWidth -
  LAYOUT.SCREEN_HORIZONTAL_PADDING * 2 -
  LAYOUT.SPACING.MEDIUM * 2 -
  16 - // Reduced from 24 for more graph space
  X_AXIS_LABEL_PADDING;

/** Use GOLDEN_RATIO from layout.ts for optimal chart proportions. */
const graphHeightFor = (graphWidth: number): number => Math.round(graphWidth / GOLDEN_RATIO);

/** The plot width for the current window. */
export const useGraphWidth = (): number => graphWidthFor(useWindowDimensions().width);

/** The plot height for the current window: the width over the golden ratio. */
export const useGraphHeight = (): number => graphHeightFor(useGraphWidth());

// Chart visual constants for perfect alignment
export const CHART_VISUAL = {
  DATA_POINT_SIZE: 2.5, // Intermediate data point radius
  DATA_POINT_EMPHASIS_SIZE: 4, // Emphasized (today/endpoint) data point radius
  DATA_POINT_RING_WIDTH: 2, // Surface ring around emphasized points
  LINE_WIDTH: 2, // Chart line stroke width
  CHART_TOP_PADDING: 20, // Top padding for visual balance
  CHART_BOTTOM_PADDING: 8, // Bottom padding to prevent dots from clipping at bottom edge
  CHART_HORIZONTAL_PADDING: 4, // Horizontal padding to prevent edge dots from clipping
} as const;

/**
 * Calculate data point positions with horizontal inset to prevent edge clipping.
 * Data points are inset by CHART_HORIZONTAL_PADDING on each side so dots
 * don't get clipped at the canvas boundaries.
 */
export const calculateDataPointPositions = (dataCount: number, graphWidth: number): number[] => {
  if (dataCount <= 1) {
    return [graphWidth / 2]; // Center single point
  }

  const positions: number[] = [];
  const horizontalPadding = CHART_VISUAL.CHART_HORIZONTAL_PADDING;
  const effectiveWidth = graphWidth - horizontalPadding * 2;
  const stepX = effectiveWidth / Math.max(1, dataCount - 1);

  for (let i = 0; i < dataCount; i++) {
    const x = horizontalPadding + i * stepX;
    positions.push(x);
  }

  return positions;
};

/**
 * Calculate effective chart height accounting for padding
 * @returns Effective height for chart data rendering
 */
export const getEffectiveChartHeight = (graphHeight: number): number => {
  return graphHeight - CHART_VISUAL.CHART_TOP_PADDING - CHART_VISUAL.CHART_BOTTOM_PADDING;
};

// Time periods - optimized for mobile clarity and user comprehension
/**
 * Horizontal gridlines on a chart's y-axis, the zero line included. An axis
 * maximum is only "nice" relative to this: `getNiceAxisMax` divides by the gaps
 * between these lines, so both read the count from here.
 */
export const Y_AXIS_LINES = 5;

export const DAYS_7 = 7; // Weekly view for better mobile experience and cognitive load
export const DAYS_30 = 30; // Monthly view — long enough for cumulative charts to visibly grow
