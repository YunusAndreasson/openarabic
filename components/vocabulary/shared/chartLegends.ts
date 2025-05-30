/**
 * Shared chart legend constants for vocabulary analytics
 * Ensures consistent terminology across all charts using FSRS-aligned language
 */

export const CHART_LEGENDS = {
  // FSRS States - using official FSRS terminology
  states: {
    new: 'New',
    learning: 'Learning',
    review: 'Review',
    relearning: 'Relearning',
  },

  // Difficulty levels - simple, clear terms aligned with FSRS
  difficulty: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  },

  // Memory strength - using FSRS retrievability concept
  memory: {
    strong: 'Strong',
    weak: 'Weak',
    critical: 'Critical',
  },

  // Performance levels - achievement-focused terms
  performance: {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  },

  // Progress tracking - action-oriented terms
  progress: {
    line: 'Progress',
    forecast: 'Forecast',
    trend: 'Trend',
    milestone: 'Milestone',
  },

  // Time ranges - consistent format
  timeRanges: {
    current: 'Current',
    past14: 'Past 14 days',
    next14: 'Next 14 days',
  },

  // Chart titles - short and clear
  titles: {
    difficulty: 'Difficulty',
    mastery: 'Mastery',
    efficiency: 'Efficiency',
    memory: 'Memory',
  },

  // Stat labels - concise and intuitive
  stats: {
    due: 'Due',
    learning: 'Learning',
    mastered: 'Mastered',
    hard: 'Hard',
    average: 'Average',
    total: 'Total',
  },
} as const;

// Type exports for better TypeScript support
export type FSRSState = keyof typeof CHART_LEGENDS.states;
export type DifficultyLevel = keyof typeof CHART_LEGENDS.difficulty;
export type MemoryLevel = keyof typeof CHART_LEGENDS.memory;
export type PerformanceLevel = keyof typeof CHART_LEGENDS.performance;
export type ProgressType = keyof typeof CHART_LEGENDS.progress;
export type TimeRange = keyof typeof CHART_LEGENDS.timeRanges;
