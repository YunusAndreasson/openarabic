import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { GOLDEN_RATIO, LAYOUT, SCREEN_WIDTH } from '@/constants/layout';

// Graph dimensions - optimized for perfect alignment and space usage with golden ratio
// For mobile-only apps, this can be a constant since screen doesn't rotate
// Slightly increase to introduce subtle horizontal breathing room for the whole graph
const X_AXIS_LABEL_PADDING = 8; // Reduced from 12 for tighter spacing

const GRAPH_WIDTH =
  SCREEN_WIDTH -
  LAYOUT.SCREEN_HORIZONTAL_PADDING * 2 -
  LAYOUT.SPACING.MEDIUM * 2 -
  16 - // Reduced from 24 for more graph space
  X_AXIS_LABEL_PADDING;

// Use GOLDEN_RATIO from layout.ts for optimal chart proportions
export const GRAPH_HEIGHT_LARGE = Math.round(GRAPH_WIDTH / GOLDEN_RATIO);

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
export const calculateDataPointPositions = (dataCount: number): number[] => {
  if (dataCount <= 1) {
    return [GRAPH_WIDTH / 2]; // Center single point
  }

  const positions: number[] = [];
  const horizontalPadding = CHART_VISUAL.CHART_HORIZONTAL_PADDING;
  const effectiveWidth = GRAPH_WIDTH - horizontalPadding * 2;
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
export const getEffectiveChartHeight = (): number => {
  return GRAPH_HEIGHT_LARGE - CHART_VISUAL.CHART_TOP_PADDING - CHART_VISUAL.CHART_BOTTOM_PADDING;
};

// Time periods - optimized for mobile clarity and user comprehension
export const DAYS_7 = 7; // Weekly view for better mobile experience and cognitive load
export const DAYS_30 = 30; // Monthly view — long enough for cumulative charts to visibly grow

/**
 * Standardized performance thresholds used across all charts
 * Derives from MEMORY_CAPACITY_THRESHOLDS for consistency with gauges and recommendations
 */
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: MEMORY_CAPACITY_THRESHOLDS.GOOD, // Green zone - excellent performance (75%+)
  GOOD: MEMORY_CAPACITY_THRESHOLDS.MODERATE, // Yellow zone - good performance (70-74%)
  FAIR: MEMORY_CAPACITY_THRESHOLDS.POOR, // Orange zone - fair performance (40-69%)
  POOR: 0, // Red zone - poor performance (<40%)
} as const;

export const useGraphWidth = (): number => GRAPH_WIDTH;
