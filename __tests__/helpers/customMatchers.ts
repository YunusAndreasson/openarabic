/**
 * Custom Jest Matchers for OpenArabic Domain Logic
 *
 * Provides reusable, readable matchers for:
 * - FSRS (Spaced Repetition) validation
 * - Arabic text validation
 * - Word state assertions
 *
 * Usage:
 *   expect(word).toBeDueWord();
 *   expect(word).toHaveValidFSRSState();
 *   expect('C*'(').toBeValidArabicText();
 */

import type { StudyWord } from '@/types/vocabulary.types';

// FSRS State enum values (from ts-fsrs)
const VALID_FSRS_STATES = [0, 1, 2, 3] as const; // New, Learning, Review, Relearning

// FSRS parameter constraints (from ts-fsrs defaults)
const FSRS_CONSTRAINTS = {
  STABILITY_MIN: 0.1,
  STABILITY_MAX: 100,
  DIFFICULTY_MIN: 1.3,
  DIFFICULTY_MAX: 10,
  REPS_MIN: 0,
  LAPSES_MIN: 0,
} as const;

// Arabic Unicode range
const ARABIC_REGEX = /^[\u0600-\u06FF\s]+$/;

/**
 * Custom matcher: Check if FSRS word is due for review
 *
 * @example
 * expect(word).toBeDueWord();
 */
function toBeDueWord(received: StudyWord): jest.CustomMatcherResult {
  const now = new Date();

  if (!received.fsrs_due) {
    return {
      pass: false,
      message: () => `expected word ${received.root_id} to have a due date, but fsrs_due is null`,
    };
  }

  const dueDate = new Date(received.fsrs_due);
  const pass = dueDate <= now;

  return {
    pass,
    message: () => {
      if (pass) {
        return `expected word ${received.root_id} NOT to be due (due: ${received.fsrs_due}, now: ${now.toISOString()})`;
      }
      return `expected word ${received.root_id} to be due for review (due: ${received.fsrs_due}, now: ${now.toISOString()})`;
    },
  };
}

/**
 * Custom matcher: Validate FSRS state constraints
 *
 * Checks:
 * - Stability is within valid range (0.1 to 100)
 * - Difficulty is within valid range (1.3 to 10)
 * - State is valid enum value (0-3)
 * - Reps and lapses are non-negative
 *
 * @example
 * expect(word).toHaveValidFSRSState();
 */
function toHaveValidFSRSState(received: StudyWord): jest.CustomMatcherResult {
  const errors: string[] = [];

  // Check stability
  if (
    received.fsrs_stability !== null &&
    (received.fsrs_stability < FSRS_CONSTRAINTS.STABILITY_MIN ||
      received.fsrs_stability > FSRS_CONSTRAINTS.STABILITY_MAX)
  ) {
    errors.push(
      `stability ${received.fsrs_stability} out of range [${FSRS_CONSTRAINTS.STABILITY_MIN}, ${FSRS_CONSTRAINTS.STABILITY_MAX}]`,
    );
  }

  // Check difficulty
  if (
    received.fsrs_difficulty !== null &&
    (received.fsrs_difficulty < FSRS_CONSTRAINTS.DIFFICULTY_MIN ||
      received.fsrs_difficulty > FSRS_CONSTRAINTS.DIFFICULTY_MAX)
  ) {
    errors.push(
      `difficulty ${received.fsrs_difficulty} out of range [${FSRS_CONSTRAINTS.DIFFICULTY_MIN}, ${FSRS_CONSTRAINTS.DIFFICULTY_MAX}]`,
    );
  }

  // Check state enum
  if (!VALID_FSRS_STATES.includes(received.fsrs_state as 0 | 1 | 2 | 3)) {
    errors.push(`state ${received.fsrs_state} is not valid (must be 0-3)`);
  }

  // Check reps
  if (received.fsrs_reps !== null && received.fsrs_reps < FSRS_CONSTRAINTS.REPS_MIN) {
    errors.push(`reps ${received.fsrs_reps} cannot be negative`);
  }

  // Check lapses
  if (received.fsrs_lapses !== null && received.fsrs_lapses < FSRS_CONSTRAINTS.LAPSES_MIN) {
    errors.push(`lapses ${received.fsrs_lapses} cannot be negative`);
  }

  const pass = errors.length === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return `expected word ${received.root_id} NOT to have valid FSRS state`;
      }
      return `expected word ${received.root_id} to have valid FSRS state, but found:\n  ${errors.join('\n  ')}`;
    },
  };
}

/**
 * Custom matcher: Validate Arabic text
 *
 * Checks if text contains only Arabic characters and whitespace
 *
 * @example
 * expect('C*'(').toBeValidArabicText();
 * expect('H'DC*'(').toBeValidArabicText();
 */
function toBeValidArabicText(received: string): jest.CustomMatcherResult {
  const pass = ARABIC_REGEX.test(received);

  return {
    pass,
    message: () => {
      if (pass) {
        return `expected "${received}" NOT to be valid Arabic text`;
      }
      return `expected "${received}" to be valid Arabic text (Arabic Unicode range U+0600-U+06FF only)`;
    },
  };
}

/**
 * Custom matcher: Check stability within range
 *
 * @example
 * expect(word).toHaveStability(5, 10);
 */
function toHaveStability(received: StudyWord, min: number, max: number): jest.CustomMatcherResult {
  if (received.fsrs_stability === null) {
    return {
      pass: false,
      message: () =>
        `expected word ${received.root_id} to have stability, but fsrs_stability is null`,
    };
  }

  const pass = received.fsrs_stability >= min && received.fsrs_stability <= max;

  return {
    pass,
    message: () => {
      if (pass) {
        return `expected word ${received.root_id} NOT to have stability between ${min} and ${max}, but got ${received.fsrs_stability}`;
      }
      return `expected word ${received.root_id} to have stability between ${min} and ${max}, but got ${received.fsrs_stability}`;
    },
  };
}

/**
 * Custom matcher: Check FSRS state enum value
 *
 * @example
 * expect(word).toBeInState(2); // Review state
 */
function toBeInState(received: StudyWord, expectedState: 0 | 1 | 2 | 3): jest.CustomMatcherResult {
  const pass = received.fsrs_state === expectedState;

  const stateNames = {
    0: 'New',
    1: 'Learning',
    2: 'Review',
    3: 'Relearning',
  } as const;

  return {
    pass,
    message: () => {
      if (pass) {
        return `expected word ${received.root_id} NOT to be in state ${expectedState} (${stateNames[expectedState]})`;
      }
      return `expected word ${received.root_id} to be in state ${expectedState} (${stateNames[expectedState]}), but got ${received.fsrs_state} (${stateNames[received.fsrs_state as 0 | 1 | 2 | 3]})`;
    },
  };
}

/**
 * Custom matcher: Check if word has been reviewed at least N times
 *
 * @example
 * expect(word).toHaveBeenReviewedAtLeast(3);
 */
function toHaveBeenReviewedAtLeast(received: StudyWord, minReps: number): jest.CustomMatcherResult {
  if (received.fsrs_reps === null) {
    return {
      pass: false,
      message: () => `expected word ${received.root_id} to have reps, but fsrs_reps is null`,
    };
  }

  const pass = received.fsrs_reps >= minReps;

  return {
    pass,
    message: () => {
      if (pass) {
        return `expected word ${received.root_id} NOT to have been reviewed at least ${minReps} times, but got ${received.fsrs_reps} reps`;
      }
      return `expected word ${received.root_id} to have been reviewed at least ${minReps} times, but got ${received.fsrs_reps} reps`;
    },
  };
}

/**
 * Custom matcher: Check if word is overdue by at least N hours
 *
 * @example
 * expect(word).toBeOverdueBy(24); // At least 24 hours overdue
 */
function toBeOverdueBy(received: StudyWord, hours: number): jest.CustomMatcherResult {
  if (!received.fsrs_due) {
    return {
      pass: false,
      message: () => `expected word ${received.root_id} to have a due date, but fsrs_due is null`,
    };
  }

  const now = new Date();
  const dueDate = new Date(received.fsrs_due);
  const overdueMs = now.getTime() - dueDate.getTime();
  const overdueHours = overdueMs / (1000 * 60 * 60);

  const pass = overdueHours >= hours;

  return {
    pass,
    message: () => {
      if (pass) {
        return `expected word ${received.root_id} NOT to be overdue by at least ${hours} hours, but is overdue by ${overdueHours.toFixed(1)} hours`;
      }
      return `expected word ${received.root_id} to be overdue by at least ${hours} hours, but is only overdue by ${overdueHours.toFixed(1)} hours`;
    },
  };
}

// Export matchers for Jest registration
export const customMatchers = {
  toBeDueWord,
  toHaveValidFSRSState,
  toBeValidArabicText,
  toHaveStability,
  toBeInState,
  toHaveBeenReviewedAtLeast,
  toBeOverdueBy,
};

// TypeScript type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Check if FSRS word is due for review
       * @example expect(word).toBeDueWord()
       */
      toBeDueWord(): R;

      /**
       * Validate FSRS state constraints (stability, difficulty, state, reps, lapses)
       * @example expect(word).toHaveValidFSRSState()
       */
      toHaveValidFSRSState(): R;

      /**
       * Validate Arabic text (Arabic Unicode range only)
       * @example expect('C*'(').toBeValidArabicText()
       */
      toBeValidArabicText(): R;

      /**
       * Check stability within range
       * @param min Minimum stability value
       * @param max Maximum stability value
       * @example expect(word).toHaveStability(5, 10)
       */
      toHaveStability(min: number, max: number): R;

      /**
       * Check FSRS state enum value (0=New, 1=Learning, 2=Review, 3=Relearning)
       * @param expectedState Expected FSRS state (0-3)
       * @example expect(word).toBeInState(2)
       */
      toBeInState(expectedState: 0 | 1 | 2 | 3): R;

      /**
       * Check if word has been reviewed at least N times
       * @param minReps Minimum number of repetitions
       * @example expect(word).toHaveBeenReviewedAtLeast(3)
       */
      toHaveBeenReviewedAtLeast(minReps: number): R;

      /**
       * Check if word is overdue by at least N hours
       * @param hours Minimum hours overdue
       * @example expect(word).toBeOverdueBy(24)
       */
      toBeOverdueBy(hours: number): R;
    }
  }
}
