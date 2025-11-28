import type { StepUnit } from 'ts-fsrs';

export const DEFAULT_LEARNING_STEPS: StepUnit[] = ['1m', '10m'];
export const DEFAULT_RELEARNING_STEPS: StepUnit[] = ['5m', '10m'];

// Base keys for consistent cache management
export const FSRS_BASE_KEY = 'fsrs-words';

export const MIN_WORD_SPACING = 3;

// Default values and scaling
export const DEFAULT_FSRS_DIFFICULTY = 6.5;

export const CRITICAL_RETRIEVABILITY_THRESHOLD = 0.7;

// Word classification thresholds
export const UNSTABLE_STABILITY_THRESHOLD = 7;
export const UNSTABLE_DIFFICULTY_THRESHOLD = 7.5;

export const DEFAULT_SESSION_COOLDOWN_HOURS = 2;

// Spacing and scheduling constants
export const SPACING_ITERATION_LIMIT = 20;
// Chart thresholds
export const URGENT_RETRIEVABILITY_THRESHOLD = 0.5;
export const TREND_CHANGE_THRESHOLD = 0.1;
export const MASTERY_TREND_THRESHOLD = 3;

/**
 * Memory capacity thresholds for vocabulary retention
 * These values determine when to show warnings, color coding, and recommendation logic
 * Used across: article recommendations, charts, gauges, and retention displays
 */
export const MEMORY_CAPACITY_THRESHOLDS = {
  /** Below this threshold shows red warning (poor retention) */
  POOR: 40,
  /** Below this threshold shows orange warning (moderate retention) */
  MODERATE: 70,
  /** Above this threshold shows green (good retention) */
  GOOD: 75,
} as const;

// Optimized FSRS configuration
export const OPTIMIZED_FSRS_CONFIG = {
  learning_steps: DEFAULT_LEARNING_STEPS,
  relearning_steps: DEFAULT_RELEARNING_STEPS,
  request_retention: 0.95,
  maximum_interval: 180,
  enable_fuzz: true,
  // TODO: Research enable_short_term behavior in ts-fsrs v5
  // The ts-fsrs documentation doesn't clearly explain what this parameter does
  // Current setting (true) is working correctly with session-based learning
  // May affect short-term vs long-term memory modeling
  enable_short_term: true,
  timeout: 120000,
  // Use library defaults for weights and derived options to avoid version drift
} as const;
