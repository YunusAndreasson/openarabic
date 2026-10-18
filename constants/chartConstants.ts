// Chart visual constants for perfect alignment
export const CHART_VISUAL = {
  DATA_POINT_SIZE: 2.5, // Intermediate data point radius
  DATA_POINT_EMPHASIS_SIZE: 4, // Emphasized (today/endpoint) data point radius
  DATA_POINT_RING_WIDTH: 2, // Surface ring around emphasized points
  LINE_WIDTH: 2, // Chart line stroke width
} as const;

// Time periods - optimized for mobile clarity and user comprehension
export const DAYS_7 = 7; // Weekly view for better mobile experience and cognitive load
