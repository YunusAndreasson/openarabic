import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';

// Graph dimensions - optimized for perfect alignment and space usage with golden ratio
// For mobile-only apps, this can be a constant since screen doesn't rotate
// Slightly increase to introduce subtle horizontal breathing room for the whole graph
const X_AXIS_LABEL_PADDING = 8; // Reduced from 12 for tighter spacing

export const GRAPH_WIDTH =
  SCREEN_WIDTH -
  LAYOUT.SCREEN_EDGE_PADDING * 2 -
  LAYOUT.SPACING.MEDIUM * 2 -
  16 - // Reduced from 24 for more graph space
  X_AXIS_LABEL_PADDING;

/**
 * Calculate data point positions across full chart width
 * Returns positions from 0 to GRAPH_WIDTH for proper line/fill rendering
 */
export const calculateDataPointPositions = (dataCount: number): number[] => {
  if (dataCount <= 1) {
    return [GRAPH_WIDTH / 2]; // Center single point
  }

  const positions: number[] = [];
  // Use full width for line and fill that extends to edges
  const stepX = GRAPH_WIDTH / Math.max(1, dataCount - 1);

  for (let i = 0; i < dataCount; i++) {
    const x = i * stepX;
    positions.push(x);
  }

  return positions;
};

// Golden ratio for optimal chart proportions
const GOLDEN_RATIO = 1.618;
export const GRAPH_HEIGHT_LARGE = Math.round(GRAPH_WIDTH / GOLDEN_RATIO); // Dynamic height following golden ratio

// Chart visual constants for perfect alignment
export const CHART_VISUAL = {
  DATA_POINT_SIZE: 3.5, // Primary data point radius
  DATA_POINT_INNER_SIZE: 2, // Inner highlight radius
  LINE_WIDTH: 2.5, // Chart line stroke width
  CHART_TOP_PADDING: 20, // Top padding for visual balance
  CHART_BOTTOM_PADDING: 8, // Bottom padding to prevent dots from clipping at bottom edge
} as const;

/**
 * Calculate effective chart height accounting for padding
 * @returns Effective height for chart data rendering
 */
export const getEffectiveChartHeight = (): number => {
  return GRAPH_HEIGHT_LARGE - CHART_VISUAL.CHART_TOP_PADDING - CHART_VISUAL.CHART_BOTTOM_PADDING;
};

// Time periods - optimized for mobile clarity and user comprehension
export const DAYS_7 = 7; // Weekly view for better mobile experience and cognitive load

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

// Standardized chart layout constants for consistent alignment
export const CHART_LAYOUT = {
  // Card content padding - consistent across all charts
  CONTENT_PADDING: LAYOUT.SPACING.MEDIUM, // 12px

  // Chart spacing within cards
  ELEMENT_SPACING: LAYOUT.SPACING.LARGE, // 16px between major elements
} as const;

export const useGraphWidth = (): number => GRAPH_WIDTH;
