import type { StepUnit } from 'ts-fsrs';

export const DEFAULT_LEARNING_STEPS: StepUnit[] = ['1m', '10m'];
export const DEFAULT_RELEARNING_STEPS: StepUnit[] = ['5m', '10m'];

// Vocabulary session configuration
export const SESSION_CONFIG = {
  MAX_NEW_WORDS: 20,
  MAX_REVIEW_WORDS: 50,
  MIN_SESSION_SIZE: 1, // was 5
} as const;

// Base keys for consistent cache management
export const FSRS_BASE_KEY = 'fsrs-words';
export const STRUGGLING_WORDS_KEY = 'struggling-words';

// Query keys for consistent cache management
export const FSRS_QUERY_KEYS = {
  all: (userId: string) => [FSRS_BASE_KEY, userId] as const,
  due: (userId: string) => [FSRS_BASE_KEY, userId, 'due'] as const,
  stats: (userId: string) => [FSRS_BASE_KEY, userId, 'stats'] as const,
  struggling: (userId: string, limit: number) => [STRUGGLING_WORDS_KEY, userId, limit] as const,
  filtered: (userId: string, category: string) =>
    [FSRS_BASE_KEY, userId, 'filtered', category] as const,
  // Fallback keys when userId is not available (unauthenticated state)
  FALLBACK: {
    all: [FSRS_BASE_KEY] as const,
    due: [FSRS_BASE_KEY, 'due'] as const,
    stats: [FSRS_BASE_KEY, 'stats'] as const,
  },
  DUE_WORDS: 'fsrs-words-due',
  STUDY_WORDS: 'fsrs-words-study',
  USER_WORDS: 'fsrs-words-user',
  MASTERY_CHART: 'fsrs-mastery-chart',
  RETRIEVABILITY_CHART: 'fsrs-retrievability-chart',
  MEMORY_CAPACITY: 'fsrs-memory-capacity',
} as const;

export const MIN_WORD_SPACING = 3;

// Default values and scaling
export const DEFAULT_FSRS_DIFFICULTY = 6.5;
export const FSRS_DIFFICULTY_SCALE = 10.0;

export const CRITICAL_RETRIEVABILITY_THRESHOLD = 0.7;

export const FSRS_DIFFICULTY_THRESHOLDS = {
  EASY: 0.65,
  MEDIUM: 0.8,
} as const;

// Word classification thresholds
export const STRUGGLING_DIFFICULTY_THRESHOLD = 8.0;
export const STRUGGLING_LAPSES_THRESHOLD = 1;
export const UNSTABLE_STABILITY_THRESHOLD = 7;
export const UNSTABLE_DIFFICULTY_THRESHOLD = 7.5;

// Mastery thresholds
export const MASTERED_STABILITY_THRESHOLD = 14;
export const STRICT_MASTERED_STABILITY_THRESHOLD = 21;
export const MASTERED_DIFFICULTY_MAX = 5;
export const LEARNING_STABILITY_UPPER_BOUND = 21;
export const LEARNING_DIFFICULTY_MIN = 3;

// Learning efficiency constants
export const LEARNING_EFFICIENCY_MULTIPLIER = 10;

export const DEFAULT_SESSION_COOLDOWN_HOURS = 1;

// Spacing and scheduling constants
export const SPACING_ITERATION_LIMIT = 20;
export const SKIP_FOR_TODAY_DUE_HOUR = 9;

// FSRS algorithm adjustments
export const EASY_DIFFICULTY_ADJUSTMENT = 1.0;
export const EASY_STABILITY_MULTIPLIER = 1.5;
export const EASY_LAPSE_DECREMENT = 1;

export const HARD_DIFFICULTY_ADJUSTMENT = 1.0;
export const HARD_STABILITY_MULTIPLIER = 0.7;
export const HARD_LAPSE_INCREMENT = 1;

// Chart thresholds
export const URGENT_RETRIEVABILITY_THRESHOLD = 0.5;
export const TREND_CHANGE_THRESHOLD = 0.1;
export const MASTERY_TREND_THRESHOLD = 3;
export const MASTERY_MILESTONES = [7, 14, 21, 30] as const;

export const CAPACITY_THRESHOLDS = {
  READY: 70, // Green zone - ready to add words
  CAUTION: 40, // Yellow zone - add with caution
  // Below 40 is red zone - don't add
} as const;

// Performance thresholds used across charts
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const;

// Optimized FSRS configuration
export const OPTIMIZED_FSRS_CONFIG = {
  learning_steps: DEFAULT_LEARNING_STEPS,
  relearning_steps: DEFAULT_RELEARNING_STEPS,
  request_retention: 0.95,
  maximum_interval: 180,
  enable_fuzz: true,
  enable_short_term: true,
  timeout: 120000,
  // Use library defaults for weights and derived options to avoid version drift
} as const;
