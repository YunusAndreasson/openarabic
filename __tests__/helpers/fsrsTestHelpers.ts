import * as fc from 'fast-check';
import type { RootId, UserId } from '../../types/branded.types';
import type { StudyWord } from '../../types/vocabulary.types';

/**
 * Test helpers for FSRS testing
 * Provides utilities for creating test data and common test patterns
 */

// Base word factory with sensible defaults
/**
 * `fsrs_last_review` is generated as NOT NULL, but rows written before the FSRS
 * migration hold NULL and the app guards for exactly that (see
 * `utils/wordClassification`). Suites that exercise the legacy shape use this,
 * so the discrepancy between schema and reality is named once instead of an
 * `as any` at every site.
 */
export const LEGACY_NULL_TIMESTAMP = null as unknown as string;

export const createTestWord = (overrides: Partial<StudyWord> = {}): StudyWord => {
  const now = Date.now();

  // A word given reps but no explicit state defaults to Review, not New.
  //
  // This is not a convenience — it is the invariant. ts-fsrs moves a card off
  // `New` on its very first grade, so `{ state: 0, reps: 3 }` describes a word
  // that cannot exist, and `hasBeenPractised` (state !== New && reps > 0) is
  // the gate every FSRS-derived number in the app passes through. Fixtures in
  // that impossible shape used to slip past a looser filter and quietly
  // "prove" behaviour production never sees. Pass `fsrs_state` explicitly when
  // an unpractised word is genuinely what the test means.
  const defaultState = (overrides.fsrs_reps ?? 0) > 0 ? 2 : 0;

  return {
    root_id: 1 as RootId,
    user_id: 'test-user' as UserId,
    created_at: new Date(now).toISOString(),
    fsrs_due: new Date(now).toISOString(),
    fsrs_stability: 5,
    fsrs_difficulty: 6.5,
    fsrs_scheduled_days: 1,
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: defaultState,
    fsrs_last_review: new Date().toISOString(),
    difficulty: 0.65,
    root: undefined,
    // Overrides last, so an explicit state — including `null` — always wins.
    ...overrides,
  } as StudyWord;
};

// Property-based test generators
export const fsrsArbitraries = {
  // Generate valid FSRS stability values (0.1 to 100)
  stability: fc.float({
    min: Math.fround(0.1),
    max: Math.fround(100),
    noDefaultInfinity: true,
    noNaN: true,
  }),

  // Generate valid FSRS difficulty values (1.3 to 10)
  difficulty: fc.float({
    min: Math.fround(1.3),
    max: Math.fround(10),
    noDefaultInfinity: true,
    noNaN: true,
  }),

  // Generate FSRS states (0-3)
  state: fc.integer({ min: 0, max: 3 }),

  // Generate reasonable rep counts (0-100)
  reps: fc.integer({ min: 0, max: 100 }),

  // Generate lapse counts (0-20)
  lapses: fc.integer({ min: 0, max: 20 }),

  // Generate due dates (past, present, future) - ensure valid dates
  dueDate: fc
    .date({
      min: new Date('2020-01-01T00:00:00.000Z'),
      max: new Date('2030-01-01T00:00:00.000Z'),
    })
    .filter(date => !isNaN(date.getTime())),

  // Generate overdue hours (0-720 hours = 30 days)
  overdueHours: fc.integer({ min: 0, max: 720 }),

  // Generate word IDs
  wordId: fc.integer({ min: 1, max: 10000 }),
};

// Generate complete StudyWord with property-based values
export const studyWordArbitrary = fc.record({
  root_id: fsrsArbitraries.wordId,
  user_id: fc.constant('test-user'),
  created_at: fc
    .date()
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  fsrs_due: fsrsArbitraries.dueDate.map(d => d.toISOString()),
  fsrs_stability: fsrsArbitraries.stability,
  fsrs_difficulty: fsrsArbitraries.difficulty,
  fsrs_scheduled_days: fc.integer({ min: 0, max: 365 }),
  fsrs_learning_steps: fc.integer({ min: 0, max: 10 }),
  fsrs_reps: fsrsArbitraries.reps,
  fsrs_lapses: fsrsArbitraries.lapses,
  fsrs_state: fsrsArbitraries.state,
  fsrs_last_review: fc
    .date()
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  difficulty: fc.float({ min: 0, max: 1, noDefaultInfinity: true, noNaN: true }),

  root: fc.constant(undefined),
}) as fc.Arbitrary<StudyWord>;

// Generate word sets with specific properties
export const wordSetArbitrary = (size: number = 10) =>
  fc.array(studyWordArbitrary, { minLength: size, maxLength: size });

// Generate hard/struggling words (lapses >= 2, matching isHardWord definition)
export const strugglingWordArbitrary = fc.record({
  root_id: fsrsArbitraries.wordId,
  user_id: fc.constant('test-user'),
  created_at: fc
    .date()
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  fsrs_due: fsrsArbitraries.dueDate.map(d => d.toISOString()),
  fsrs_stability: fc.float({
    min: Math.fround(0.1),
    max: Math.fround(5),
    noDefaultInfinity: true,
    noNaN: true,
  }), // Low stability
  fsrs_difficulty: fc.float({
    min: Math.fround(8.0),
    max: Math.fround(10),
    noDefaultInfinity: true,
    noNaN: true,
  }), // High difficulty
  fsrs_scheduled_days: fc.integer({ min: 0, max: 365 }),
  fsrs_learning_steps: fc.integer({ min: 0, max: 10 }),
  fsrs_reps: fsrsArbitraries.reps,
  fsrs_lapses: fc.integer({ min: 2, max: 20 }), // At least 2 lapses (matches isHardWord)
  fsrs_state: fc.integer({ min: 1, max: 3 }), // Learning, Review, or Relearning
  fsrs_last_review: fc
    .date()
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  difficulty: fc.float({
    min: Math.fround(0.7),
    max: Math.fround(1),
    noDefaultInfinity: true,
    noNaN: true,
  }), // High difficulty

  root: fc.constant(undefined),
}) as fc.Arbitrary<StudyWord>;

// Generate due words (overdue)

export const propertyTestUtils = {
  // Test that a function is idempotent (same result when called twice)
  testIdempotent: <T>(fn: (input: T) => any, arbitrary: fc.Arbitrary<T>) => {
    return fc.property(arbitrary, input => {
      const result1 = fn(input);
      const result2 = fn(input);
      expect(result1).toEqual(result2);
    });
  },

  // Test that a function preserves ordering
  testOrdering: <T>(fn: (input: T) => number, arbitrary: fc.Arbitrary<T>) => {
    return fc.property(fc.array(arbitrary, { minLength: 2, maxLength: 10 }), inputs => {
      const mapped = inputs.map(fn);
      const sortedMapped = [...mapped].sort((a, b) => a - b);
      expect(mapped).toEqual(sortedMapped);
    });
  },

  // Test that a function never throws for valid inputs
  testNoThrows: <T>(fn: (input: T) => any, arbitrary: fc.Arbitrary<T>) => {
    return fc.property(arbitrary, input => {
      expect(() => fn(input)).not.toThrow();
    });
  },

  // Test that a function returns consistent types
  testConsistentTypes: <T, R>(
    fn: (input: T) => R,
    arbitrary: fc.Arbitrary<T>,
    expectedType: string,
  ) => {
    return fc.property(arbitrary, input => {
      const result = fn(input);
      expect(typeof result).toBe(expectedType);
    });
  },

  // Test that a function preserves invariants
  testInvariant: <T>(
    fn: (input: T) => any,
    arbitrary: fc.Arbitrary<T>,
    invariant: (input: T, output: any) => boolean,
  ) => {
    return fc.property(arbitrary, input => {
      const output = fn(input);
      expect(invariant(input, output)).toBeTruthy();
    });
  },
};

// Advanced test scenarios
export const advancedTestScenarios = {
  // Generate edge case combinations
  edgeCaseCombinations: () => {
    const scenarios = [
      { name: 'null values', overrides: { fsrs_stability: null, fsrs_difficulty: null } },
      { name: 'extreme values', overrides: { fsrs_stability: 999, fsrs_difficulty: 15 } },
      { name: 'zero values', overrides: { fsrs_stability: 0, fsrs_difficulty: 0 } },
      { name: 'negative values', overrides: { fsrs_stability: -1, fsrs_difficulty: -1 } },
      {
        name: 'invalid dates',
        overrides: { fsrs_due: 'invalid-date', fsrs_last_review: 'also-invalid' },
      },
      {
        name: 'future dates',
        overrides: { fsrs_due: new Date(Date.now() + 86400000).toISOString() },
      },
      { name: 'very old dates', overrides: { fsrs_due: new Date('1900-01-01').toISOString() } },
    ];

    return fc
      .record({
        scenario: fc.constantFrom(...scenarios),
        wordId: fsrsArbitraries.wordId,
      })
      .map(({ scenario, wordId }) => ({
        ...scenario,
        word: createTestWord({ root_id: wordId as RootId, ...scenario.overrides }),
      }));
  },

  // Generate state transition sequences
  stateTransitionSequences: () => {
    const validTransitions = [
      [0, 1], // New -> Learning
      [1, 2], // Learning -> Review
      [1, 3], // Learning -> Relearning
      [2, 3], // Review -> Relearning
      [3, 1], // Relearning -> Learning
    ];

    return fc
      .array(fc.constantFrom(...validTransitions), { minLength: 3, maxLength: 10 })
      .map(transitions => {
        const words = transitions.map(([fromState], index) =>
          createTestWord({
            root_id: (index + 1) as RootId,
            fsrs_state: fromState,
            fsrs_reps: index,
            fsrs_last_review: new Date(Date.now() - index * 86400000).toISOString(),
          }),
        );
        return { transitions, words };
      });
  },

  // Generate performance stress tests
  performanceStressTests: () => {
    return fc
      .record({
        wordCount: fc.integer({ min: 100, max: 1000 }),
        complexity: fc.constantFrom('low', 'medium', 'high'),
      })
      .map(({ wordCount, complexity }) => {
        const words = Array.from({ length: wordCount }, (_, i) => {
          const baseWord = createTestWord({ root_id: (i + 1) as RootId });
          switch (complexity) {
            case 'low':
              return { ...baseWord, fsrs_stability: 5, fsrs_difficulty: 6.5 };
            case 'medium':
              return {
                ...baseWord,
                fsrs_stability: Math.random() * 10 + 1,
                fsrs_difficulty: Math.random() * 5 + 5,
                fsrs_state: Math.floor(Math.random() * 4),
              };
            case 'high':
              return {
                ...baseWord,
                fsrs_stability: Math.random() * 100 + 1,
                fsrs_difficulty: Math.random() * 10 + 1,
                fsrs_state: Math.floor(Math.random() * 4),
                fsrs_reps: Math.floor(Math.random() * 50),
                fsrs_lapses: Math.floor(Math.random() * 10),
              };
          }
        });
        return { wordCount, complexity, words };
      });
  },
};

// Create words with different FSRS states for testing state transitions

/** @internal Reached through a jest.mock require(); knip cannot see it. */
export const createLargeWordSet = (count: number) => {
  return Array.from({ length: count }, (_, i) =>
    createTestWord({
      root_id: (i + 1) as RootId,
      fsrs_due: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random overdue
      fsrs_stability: Math.random() * 10 + 1,
      fsrs_difficulty: Math.random() * 5 + 5,
      fsrs_state: Math.floor(Math.random() * 4), // Random state 0-3
      fsrs_reps: Math.floor(Math.random() * 10),
      fsrs_lapses: Math.floor(Math.random() * 3),
    }),
  );
};

// Create words with edge case data
/** @internal Reached through a jest.mock require(); knip cannot see it. */
export const createEdgeCaseWords = () => ({
  corruptedDates: createTestWord({
    root_id: 1 as RootId,
    fsrs_due: 'invalid-date',
    fsrs_last_review: 'also-invalid',
  }),
  nullFSRSData: createTestWord({
    root_id: 2 as RootId,
    fsrs_stability: null,
    fsrs_difficulty: null,
    fsrs_reps: null,
    fsrs_state: null,
    fsrs_last_review: LEGACY_NULL_TIMESTAMP,
  }),
  extremeValues: createTestWord({
    root_id: 3 as RootId,
    fsrs_stability: 999,
    fsrs_difficulty: 15, // Beyond normal range
    fsrs_reps: 1000,
    fsrs_lapses: 50,
  }),
  partialData: createTestWord({
    root_id: 4 as RootId,
    fsrs_stability: 5,
    fsrs_difficulty: null,
    fsrs_reps: 2,
    fsrs_state: 1,
    fsrs_last_review: LEGACY_NULL_TIMESTAMP,
  }),
});

// Test utilities
/** @internal Reached through a jest.mock require(); knip cannot see it. */
export const testUtils = {
  // Wait for all timers and promises
  flushAllTimersAndPromises: async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    jest.runAllTimers();
  },

  // Create performance measurement wrapper
  measurePerformance: <T>(fn: () => T): { result: T; time: number } => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    return { result, time: end - start };
  },

  // Simulate rapid user interactions
  simulateRapidClicks: async (
    updateFn: (id: number, confidence: string) => Promise<void>,
    wordId: number,
  ) => {
    const promises = [
      updateFn(wordId, 'known'),
      updateFn(wordId, 'vague'),
      updateFn(wordId, 'unknown'),
    ];
    return Promise.all(promises);
  },
};

describe('fsrsTestHelpers factories', () => {
  test('createLargeWordSet returns the correct number of varied words', () => {
    const words = createLargeWordSet(5);

    expect(words).toHaveLength(5);
    expect(words[0]?.root_id).toBe(1);
    expect(words[4]?.root_id).toBe(5);

    const uniqueStability = new Set(words.map(w => w.fsrs_stability)).size;
    const uniqueDifficulty = new Set(words.map(w => w.fsrs_difficulty)).size;

    expect(uniqueStability).toBeGreaterThan(1);
    expect(uniqueDifficulty).toBeGreaterThan(1);
  });

  test('createEdgeCaseWords provides words with edge conditions', () => {
    const edgeCases = createEdgeCaseWords();

    expect(edgeCases.corruptedDates.fsrs_due).toBe('invalid-date');
    expect(edgeCases.corruptedDates.fsrs_last_review).toBe('also-invalid');

    expect(edgeCases.nullFSRSData.fsrs_stability).toBeNull();
    expect(edgeCases.nullFSRSData.fsrs_difficulty).toBeNull();
    expect(edgeCases.nullFSRSData.fsrs_reps).toBeNull();
    expect(edgeCases.nullFSRSData.fsrs_state).toBeNull();
    expect(edgeCases.nullFSRSData.fsrs_last_review).toBeNull();

    expect(edgeCases.extremeValues.fsrs_stability).toBe(999);
    expect(edgeCases.extremeValues.fsrs_difficulty).toBe(15);
    expect(edgeCases.extremeValues.fsrs_reps).toBe(1000);
    expect(edgeCases.extremeValues.fsrs_lapses).toBe(50);

    expect(edgeCases.partialData.fsrs_difficulty).toBeNull();
    expect(edgeCases.partialData.fsrs_last_review).toBeNull();
    expect(edgeCases.partialData.fsrs_state).toBe(1);
  });
});
