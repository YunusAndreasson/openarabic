/**
 * Shared chart legend constants for vocabulary analytics
 * Ensures consistent terminology across all charts
 */

export const CHART_LEGENDS = {
  // Difficulty levels - simple, clear terms
  difficulty: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  },

  // Memory retention levels - clear status indicators
  memory: {
    strong: 'Strong',
    fading: 'At Risk',
    weak: 'Critical',
  },

  // Performance levels - achievement-focused terms
  performance: {
    excellent: 'Excellent',
    good: 'Good',
    moderate: 'Fair',
    poor: 'Needs Work',
  },

  // Progress tracking - action-oriented terms
  progress: {
    line: 'Progress',
    forecast: 'Forecast',
    average: 'Daily Average',
    milestones: 'Milestones',
  },

  // Time ranges - consistent format
  timeRanges: {
    current: 'Current vocabulary',
    last14Days: 'Last 14 days',
    next14Days: 'Next 14 days',
  },
} as const;

// Type exports for better TypeScript support
export type DifficultyLevel = keyof typeof CHART_LEGENDS.difficulty;
export type MemoryLevel = keyof typeof CHART_LEGENDS.memory;
export type PerformanceLevel = keyof typeof CHART_LEGENDS.performance;
export type ProgressType = keyof typeof CHART_LEGENDS.progress;
export type TimeRange = keyof typeof CHART_LEGENDS.timeRanges;
