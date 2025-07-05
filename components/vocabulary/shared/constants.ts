import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';

// Graph dimensions - optimized for perfect alignment and space usage with golden ratio
// For mobile-only apps, this can be a constant since screen doesn't rotate
const X_AXIS_LABEL_PADDING = 6; // Reduced for tighter layout

export const GRAPH_WIDTH =
  SCREEN_WIDTH -
  LAYOUT.SCREEN_EDGE_PADDING * 2 -
  LAYOUT.CARD.PADDING.MEDIUM * 2 -
  24 - // Reduced from 32 for more graph space
  X_AXIS_LABEL_PADDING;

// Data point radius for boundary calculations
const DATA_POINT_RADIUS = 3.5; // Must match CHART_VISUAL.DATA_POINT_SIZE
export const DATA_POINT_PADDING = DATA_POINT_RADIUS * 2; // Full diameter padding for safe boundaries

// Effective chart width accounting for data point boundaries
export const EFFECTIVE_CHART_WIDTH = GRAPH_WIDTH - DATA_POINT_PADDING * 2;

/**
 * Calculate data point positions with proper boundary padding
 * Ensures all data points are fully visible within the chart canvas
 */
export const calculateDataPointPositions = (dataCount: number): number[] => {
  if (dataCount <= 1) {
    return [GRAPH_WIDTH / 2]; // Center single point
  }

  const positions: number[] = [];
  const stepX = EFFECTIVE_CHART_WIDTH / Math.max(1, dataCount - 1);

  for (let i = 0; i < dataCount; i++) {
    // Add padding to ensure data points don't get clipped at edges
    const x = DATA_POINT_PADDING + i * stepX;
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
} as const;

// Time periods - optimized for mobile clarity and user comprehension
export const DAYS_7 = 7; // Weekly view for better mobile experience and cognitive load

// Standardized performance thresholds used across all charts
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const;

// Standardized chart layout constants for consistent alignment
export const CHART_LAYOUT = {
  // Card content padding - consistent across all charts
  CONTENT_PADDING: LAYOUT.CARD.PADDING.MEDIUM, // 12px

  // Chart spacing within cards
  ELEMENT_SPACING: LAYOUT.SPACING.LARGE, // 16px between major elements
} as const;

export const useGraphWidth = (): number => GRAPH_WIDTH;
