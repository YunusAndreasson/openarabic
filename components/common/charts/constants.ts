import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';

// Graph dimensions - optimized for perfect alignment and space usage with golden ratio
// For mobile-only apps, this can be a constant since screen doesn't rotate
// Slightly increase to introduce subtle horizontal breathing room for the whole graph
const X_AXIS_LABEL_PADDING = 8; // Reduced from 12 for tighter spacing

export const GRAPH_WIDTH =
  SCREEN_WIDTH -
  LAYOUT.SCREEN_EDGE_PADDING * 2 -
  LAYOUT.CARD.PADDING.MEDIUM * 2 -
  16 - // Reduced from 24 for more graph space
  X_AXIS_LABEL_PADDING;

// Data point radius for boundary calculations
const DATA_POINT_RADIUS = 3.5; // Must match CHART_VISUAL.DATA_POINT_SIZE
export const DATA_POINT_PADDING = DATA_POINT_RADIUS * 2; // Used for boundary calculations in positioning

/**
 * Calculate data point positions with proper boundary padding
 * Ensures all data points are fully visible within the chart canvas
 * FIXED: Eliminated inward tilt by using full width and smart boundary positioning
 */
export const calculateDataPointPositions = (dataCount: number): number[] => {
  if (dataCount <= 1) {
    return [GRAPH_WIDTH / 2]; // Center single point
  }

  const positions: number[] = [];
  // Use full width for better data visualization
  const stepX = GRAPH_WIDTH / Math.max(1, dataCount - 1);

  for (let i = 0; i < dataCount; i++) {
    // Use full width but ensure dots don't exceed boundaries
    let x = i * stepX;

    // Adjust first and last points to keep dots fully visible
    if (i === 0) {
      x = DATA_POINT_RADIUS; // Start at radius, not center
    } else if (i === dataCount - 1) {
      x = GRAPH_WIDTH - DATA_POINT_RADIUS; // End at width - radius
    }

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
  CHART_TOP_PADDING: 8, // Top padding for data points (aligned to 8px grid)
  // Data point colors now use golden streak colors for better visibility
} as const;

// Time periods - optimized for mobile clarity and user comprehension
export const DAYS_7 = 7; // Weekly view for better mobile experience and cognitive load

// Standardized performance thresholds used across all charts
// Aligned with MEMORY_CAPACITY_THRESHOLDS for gauge consistency
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 75, // Green zone - excellent performance (75%+)
  GOOD: 70, // Yellow zone - good performance (70-74%)
  FAIR: 40, // Orange zone - fair performance (40-69%)
  POOR: 0, // Red zone - poor performance (<40%)
} as const;

// Standardized chart layout constants for consistent alignment
export const CHART_LAYOUT = {
  // Card content padding - consistent across all charts
  CONTENT_PADDING: LAYOUT.CARD.PADDING.MEDIUM, // 12px

  // Chart spacing within cards
  ELEMENT_SPACING: LAYOUT.SPACING.LARGE, // 16px between major elements
} as const;

export const useGraphWidth = (): number => GRAPH_WIDTH;
