import type { StudyWord } from '../../types/vocabulary.types';

/**
 * Test helpers for FSRS testing
 * Provides utilities for creating test data and common test patterns
 */

// Base word factory with sensible defaults
export const createTestWord = (overrides: Partial<StudyWord> = {}): StudyWord => {
  const now = Date.now();
  return {
    root_id: 1,
    user_id: 'test-user',
    created_at: new Date(now).toISOString(),
    fsrs_due: new Date(now).toISOString(),
    fsrs_stability: 5,
    fsrs_difficulty: 6.5,
    fsrs_elapsed_days: 0,
    fsrs_scheduled_days: 1,
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: 0,
    fsrs_last_review: null,
    difficulty: 0.65,
    success_streak: 0,
    root: undefined,
    ...overrides,
  } as StudyWord;
};

// Factory for creating word sets with priority scenarios
export const createWordSet = (
  scenarios: Array<{
    id: number;
    hoursOverdue?: number;
    stability?: number;
    difficulty?: number;
    state?: number;
    reps?: number;
    lapses?: number;
  }>
) => {
  const now = Date.now();
  return scenarios.map(
    ({ id, hoursOverdue = 0, stability = 5, difficulty = 6.5, state = 0, reps = 0, lapses = 0 }) =>
      createTestWord({
        root_id: id,
        fsrs_due: new Date(now - hoursOverdue * 3600 * 1000).toISOString(),
        fsrs_stability: stability,
        fsrs_difficulty: difficulty,
        fsrs_state: state,
        fsrs_reps: reps,
        fsrs_lapses: lapses,
      })
  );
};

// Create words with different FSRS states for testing state transitions
export const createWordsWithStates = () => ({
  newWord: createTestWord({
    root_id: 1,
    fsrs_state: 0, // New
    fsrs_reps: 0,
    fsrs_stability: 0,
    fsrs_difficulty: 6.5,
  }),
  learningWord: createTestWord({
    root_id: 2,
    fsrs_state: 1, // Learning
    fsrs_reps: 1,
    fsrs_stability: 1.5,
    fsrs_difficulty: 6.8,
  }),
  reviewWord: createTestWord({
    root_id: 3,
    fsrs_state: 2, // Review
    fsrs_reps: 5,
    fsrs_stability: 10,
    fsrs_difficulty: 6.2,
  }),
  relearningWord: createTestWord({
    root_id: 4,
    fsrs_state: 3, // Relearning
    fsrs_reps: 3,
    fsrs_stability: 2,
    fsrs_difficulty: 7.5,
    fsrs_lapses: 2,
  }),
});

// Create large dataset for performance testing
export const createLargeWordSet = (count: number) => {
  return Array.from({ length: count }, (_, i) =>
    createTestWord({
      root_id: i + 1,
      fsrs_due: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random overdue
      fsrs_stability: Math.random() * 10 + 1,
      fsrs_difficulty: Math.random() * 5 + 5,
      fsrs_state: Math.floor(Math.random() * 4), // Random state 0-3
      fsrs_reps: Math.floor(Math.random() * 10),
      fsrs_lapses: Math.floor(Math.random() * 3),
    })
  );
};

// Create words with edge case data
export const createEdgeCaseWords = () => ({
  corruptedDates: createTestWord({
    root_id: 1,
    fsrs_due: 'invalid-date',
    fsrs_last_review: 'also-invalid',
  }),
  nullFSRSData: createTestWord({
    root_id: 2,
    fsrs_stability: null,
    fsrs_difficulty: null,
    fsrs_reps: null,
    fsrs_state: null,
    fsrs_last_review: null,
  }),
  extremeValues: createTestWord({
    root_id: 3,
    fsrs_stability: 999,
    fsrs_difficulty: 15, // Beyond normal range
    fsrs_reps: 1000,
    fsrs_lapses: 50,
  }),
  partialData: createTestWord({
    root_id: 4,
    fsrs_stability: 5,
    fsrs_difficulty: null,
    fsrs_reps: 2,
    fsrs_state: 1,
    fsrs_last_review: null,
  }),
});

// Mock query client factory
export const createMockQueryClient = () => ({
  invalidateQueries: jest.fn(),
  removeQueries: jest.fn(),
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
});

// Common test patterns
export const testPatterns = {
  // Pattern for testing priority ordering
  priorityTestCases: [
    {
      name: 'overdue words get highest priority',
      words: [
        { id: 1, hoursOverdue: 24, stability: 5, difficulty: 6.5 },
        { id: 2, hoursOverdue: 12, stability: 5, difficulty: 6.5 },
        { id: 3, hoursOverdue: 0, stability: 5, difficulty: 6.5 },
      ],
      expectedOrder: [1, 2, 3],
    },
    {
      name: 'lower stability gets higher priority when due dates equal',
      words: [
        { id: 1, hoursOverdue: 0, stability: 1, difficulty: 6.5 },
        { id: 2, hoursOverdue: 0, stability: 10, difficulty: 6.5 },
        { id: 3, hoursOverdue: 0, stability: 5, difficulty: 6.5 },
      ],
      expectedOrder: [1, 3, 2],
    },
    {
      name: 'higher difficulty gets slight priority boost',
      words: [
        { id: 1, hoursOverdue: 0, stability: 5, difficulty: 8.0 },
        { id: 2, hoursOverdue: 0, stability: 5, difficulty: 5.0 },
        { id: 3, hoursOverdue: 0, stability: 5, difficulty: 6.5 },
      ],
      expectedOrder: [1, 3, 2],
    },
  ],

  // Pattern for testing confidence to rating mapping
  confidenceRatingCases: [
    { confidence: 'known' as const, expectedRating: 3, description: 'known maps to Good' },
    { confidence: 'vague' as const, expectedRating: 2, description: 'vague maps to Hard' },
    { confidence: 'unknown' as const, expectedRating: 1, description: 'unknown maps to Again' },
  ],

  // Pattern for testing data transformation scenarios
  dataTransformationCases: [
    {
      name: 'new word with no FSRS history',
      word: {
        fsrs_stability: null,
        fsrs_difficulty: null,
        fsrs_reps: null,
        fsrs_state: null,
        fsrs_last_review: null,
      },
    },
    {
      name: 'word with partial FSRS data',
      word: {
        fsrs_stability: 5,
        fsrs_difficulty: null,
        fsrs_reps: 2,
        fsrs_state: 1,
        fsrs_last_review: null,
      },
    },
    {
      name: 'word with complete FSRS history',
      word: {
        fsrs_stability: 10,
        fsrs_difficulty: 7.5,
        fsrs_reps: 5,
        fsrs_state: 2,
        fsrs_last_review: new Date().toISOString(),
      },
    },
  ],
};

// Performance benchmarks
export const performanceBenchmarks = {
  QUEUE_INIT_TIME: 100, // ms
  UPDATE_TIME: 50, // ms per update
  LARGE_DATASET_PROCESSING: 200, // ms for 1000+ words
};

// Test utilities
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
    wordId: number
  ) => {
    const promises = [
      updateFn(wordId, 'known'),
      updateFn(wordId, 'vague'),
      updateFn(wordId, 'unknown'),
    ];
    return Promise.all(promises);
  },
};

// Simple test to prevent Jest from complaining about no tests
describe('FSRS Test Helpers', () => {
  test('createTestWord factory works correctly', () => {
    const word = createTestWord({ root_id: 123 });
    expect(word.root_id).toBe(123);
    expect(word.user_id).toBe('test-user');
    expect(word.fsrs_stability).toBe(5);
  });

  test('createWordSet factory creates correct scenarios', () => {
    const words = createWordSet([
      { id: 1, hoursOverdue: 24 },
      { id: 2, hoursOverdue: 12 },
    ]);

    expect(words).toHaveLength(2);
    expect(words[0].root_id).toBe(1);
    expect(words[1].root_id).toBe(2);
  });

  test('createMockQueryClient provides all required methods', () => {
    const mockClient = createMockQueryClient();
    expect(mockClient.invalidateQueries).toBeDefined();
    expect(mockClient.removeQueries).toBeDefined();
    expect(mockClient.getQueryData).toBeDefined();
    expect(mockClient.setQueryData).toBeDefined();
  });
});
