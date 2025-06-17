import type { StepUnit } from 'ts-fsrs';

export const DEFAULT_LEARNING_STEPS: StepUnit[] = ['1m', '10m'];
export const DEFAULT_RELEARNING_STEPS: StepUnit[] = ['5m', '10m'];

export const OPTIMIZED_FSRS_CONFIG = {
  learning_steps: DEFAULT_LEARNING_STEPS,
  relearning_steps: DEFAULT_RELEARNING_STEPS,
  request_retention: 0.95,
  maximum_interval: 180,
  enable_fuzz: true,
  enable_short_term: true,
  timeout: 120000,
} as const;

export const FSRS_QUERY_KEYS = {
  all: (userId: string) => ['fsrs-words', userId] as const,
  due: (userId: string) => ['fsrs-words', userId, 'due'] as const,
  stats: (userId: string) => ['fsrs-words', userId, 'stats'] as const,
  filtered: (userId: string, category: string) =>
    ['fsrs-words', userId, 'filtered', category] as const,
} as const;

export const MIN_WORD_SPACING = 3;

export const CRITICAL_RETRIEVABILITY_THRESHOLD = 0.7;

export const FSRS_DIFFICULTY_THRESHOLDS = {
  EASY: 0.65,
  MEDIUM: 0.8,
} as const;

export const MASTERED_STABILITY_THRESHOLD = 7;
export const STRICT_MASTERED_STABILITY_THRESHOLD = 21;
export const MASTERED_DIFFICULTY_MAX = 5;
export const LEARNING_STABILITY_UPPER_BOUND = 21;
export const LEARNING_DIFFICULTY_MIN = 3;
export const STRUGGLING_DIFFICULTY_THRESHOLD = 8.0;
export const UNSTABLE_STABILITY_THRESHOLD = 7;
export const STRUGGLING_LAPSES_THRESHOLD = 1;

export const UNSTABLE_DIFFICULTY_THRESHOLD = 7.0;

export const DEFAULT_SESSION_COOLDOWN_HOURS = 1;
