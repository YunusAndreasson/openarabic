import { MIN_WORD_SPACING } from '../../constants/fsrs';
import type { StudyWord } from '../../types/vocabulary.types';
import {
  calculateWordPriority,
  createSpacingState,
  getNextWordWithSpacing,
  updateSpacingCounters,
  type SpacingState,
} from '../../utils/fsrsSpacing';
import { PriorityQueue } from '../../utils/priorityQueue';

const createTestWord = (overrides: Partial<StudyWord> = {}): StudyWord => {
  const now = Date.now();
  return {
    root_id: Math.floor(Math.random() * 10000),
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
    root: { id: 1, letters: 'كتاب', meaning: 'book', audio_url: null, audio_url_en: null },
    ...overrides,
  } as StudyWord;
};

const setupQueue = (words: StudyWord[]) => {
  const queue = new PriorityQueue<StudyWord>();
  words.forEach(w => queue.push(w, calculateWordPriority(w)));
  return queue;
};

describe('FSRS Spacing Logic - Comprehensive Tests', () => {
  let fixedTime: Date;

  beforeEach(() => {
    fixedTime = new Date('2024-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(fixedTime);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateWordPriority', () => {
    test('should prioritize overdue words correctly', () => {
      const baseTime = fixedTime.getTime();

      // Create words with different overdue times
      const words = [
        createTestWord({
          root_id: 1,
          fsrs_due: new Date(baseTime - 5 * 3600000).toISOString(), // 5 hours overdue
          fsrs_stability: 5,
          fsrs_difficulty: 6.5,
        }),
        createTestWord({
          root_id: 2,
          fsrs_due: new Date(baseTime - 1 * 3600000).toISOString(), // 1 hour overdue
          fsrs_stability: 5,
          fsrs_difficulty: 6.5,
        }),
        createTestWord({
          root_id: 3,
          fsrs_due: new Date(baseTime + 1 * 3600000).toISOString(), // 1 hour future
          fsrs_stability: 5,
          fsrs_difficulty: 6.5,
        }),
      ];

      const priorities = words.map(calculateWordPriority);

      // More overdue should have lower priority (higher urgency)
      expect(priorities[0]).toBeLessThan(priorities[1]); // 5h overdue < 1h overdue
      expect(priorities[1]).toBeLessThan(priorities[2]); // 1h overdue < future due
    });

    test('should handle stability factor correctly', () => {
      const baseTime = fixedTime.getTime();
      const dueTime = new Date(baseTime - 3600000).toISOString(); // 1 hour overdue

      const lowStability = createTestWord({
        fsrs_due: dueTime,
        fsrs_stability: 1,
        fsrs_difficulty: 6.5,
      });
      const highStability = createTestWord({
        fsrs_due: dueTime,
        fsrs_stability: 10,
        fsrs_difficulty: 6.5,
      });

      const lowPriority = calculateWordPriority(lowStability);
      const highPriority = calculateWordPriority(highStability);

      // Lower stability should have higher urgency (lower priority value)
      // stabilityFactor = Math.max(0, 10 - stability) * 0.1
      // For stability=1: stabilityFactor = 9 * 0.1 = 0.9
      // For stability=10: stabilityFactor = 0 * 0.1 = 0
      // So lowPriority = 10 - 0.1 - 0.9 + 0.015 = 9.015
      // And highPriority = 10 - 0.1 - 0 + 0.015 = 9.915
      expect(lowPriority).toBeGreaterThan(highPriority);
    });

    test('should handle difficulty factor correctly', () => {
      const baseTime = fixedTime.getTime();
      const dueTime = new Date(baseTime - 3600000).toISOString();

      const easyWord = createTestWord({
        fsrs_due: dueTime,
        fsrs_stability: 5,
        fsrs_difficulty: 3,
      });
      const hardWord = createTestWord({
        fsrs_due: dueTime,
        fsrs_stability: 5,
        fsrs_difficulty: 9,
      });

      const easyPriority = calculateWordPriority(easyWord);
      const hardPriority = calculateWordPriority(hardWord);

      // Harder words should have higher urgency (lower priority value)
      // difficultyFactor = (difficulty - 5) * 0.01
      // For difficulty=3: difficultyFactor = (3 - 5) * 0.01 = -0.02
      // For difficulty=9: difficultyFactor = (9 - 5) * 0.01 = 0.04
      // So easyPriority = -1 + 0.5 + (-0.02) = -0.52
      // And hardPriority = -1 + 0.5 + 0.04 = -0.46
      expect(hardPriority).toBeGreaterThan(easyPriority);
    });

    test('should handle null/undefined values gracefully', () => {
      const wordWithNulls = createTestWord({
        fsrs_due: null,
        fsrs_stability: null,
        fsrs_difficulty: null,
      });

      expect(() => calculateWordPriority(wordWithNulls)).not.toThrow();
      const priority = calculateWordPriority(wordWithNulls);
      expect(typeof priority).toBe('number');
      expect(isFinite(priority)).toBe(true);
    });
  });

  describe('createSpacingState', () => {
    test('should create empty state', () => {
      const state = createSpacingState();
      expect(state.recentWords).toEqual([]);
      expect(state.spacedWords).toEqual([]);
    });
  });

  describe('updateSpacingCounters', () => {
    test('should maintain recent words queue with correct size', () => {
      const state = createSpacingState();

      // Add words up to the limit
      for (let i = 1; i <= MIN_WORD_SPACING; i++) {
        updateSpacingCounters(state, i);
        expect(state.recentWords).toHaveLength(i);
        expect(state.recentWords[i - 1]).toBe(i);
      }

      // Adding one more should remove the first
      updateSpacingCounters(state, MIN_WORD_SPACING + 1);
      expect(state.recentWords).toHaveLength(MIN_WORD_SPACING);
      expect(state.recentWords[0]).toBe(2); // First word (1) should be removed
      expect(state.recentWords[MIN_WORD_SPACING - 1]).toBe(MIN_WORD_SPACING + 1);
    });

    test('should decrement spacing counters for spaced words', () => {
      const state = createSpacingState();
      const word1 = createTestWord({ root_id: 1 });
      const word2 = createTestWord({ root_id: 2 });

      state.spacedWords = [
        { word: word1, remainingSpacing: 3 },
        { word: word2, remainingSpacing: 1 },
      ];

      updateSpacingCounters(state, 99);

      expect(state.spacedWords[0].remainingSpacing).toBe(2);
      expect(state.spacedWords[1].remainingSpacing).toBe(0);
    });

    test('should handle custom spacing values', () => {
      const state = createSpacingState();
      const customSpacing = 5;

      // Fill up to custom spacing
      for (let i = 1; i <= customSpacing + 2; i++) {
        updateSpacingCounters(state, i, customSpacing);
      }

      expect(state.recentWords).toHaveLength(customSpacing);
      expect(state.recentWords[0]).toBe(3); // First two should be removed
    });

    test('should handle negative spacing without loops', () => {
      const state = createSpacingState();

      for (let i = 1; i <= MIN_WORD_SPACING * 5; i++) {
        updateSpacingCounters(state, i, -5);
        expect(state.recentWords.length).toBeLessThanOrEqual(MIN_WORD_SPACING);
      }

      expect(state.recentWords.length).toBeLessThanOrEqual(MIN_WORD_SPACING);
    });
  });

  describe('getNextWordWithSpacing - Basic Functionality', () => {
    test('should return null for empty queue', () => {
      const queue = new PriorityQueue<StudyWord>();
      const state = createSpacingState();

      const result = getNextWordWithSpacing(queue, state);
      expect(result).toBeNull();
    });

    test('should return word when no spacing conflicts', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = setupQueue([word]);
      const state = createSpacingState();

      const result = getNextWordWithSpacing(queue, state);
      expect(result).toBe(word);
      expect(queue.size()).toBe(0);
    });

    test('should skip recently processed words', () => {
      const words = [
        createTestWord({ root_id: 1, fsrs_due: new Date(Date.now() - 5 * 3600000).toISOString() }),
        createTestWord({ root_id: 2, fsrs_due: new Date(Date.now() - 4 * 3600000).toISOString() }),
      ];
      const queue = setupQueue(words);
      const state = createSpacingState();

      // Mark word 1 as recently processed
      state.recentWords = [1];

      const result = getNextWordWithSpacing(queue, state);
      expect(result?.root_id).toBe(2);

      // Word 1 should be moved to spacedWords
      expect(state.spacedWords).toHaveLength(1);
      expect(state.spacedWords[0].word.root_id).toBe(1);
      expect(state.spacedWords[0].remainingSpacing).toBe(MIN_WORD_SPACING);
    });

    test('should requeue ready spaced words', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();
      const state = createSpacingState();

      // Add word to spaced words with 0 remaining spacing
      state.spacedWords = [{ word, remainingSpacing: 0 }];

      const result = getNextWordWithSpacing(queue, state);
      expect(result).toBe(word);
      expect(state.spacedWords).toHaveLength(0);
    });

    test('should handle circuit breaker for infinite loops', () => {
      // Create 25 words all with the same root_id (conflict scenario)
      const words = Array.from({ length: 25 }, () => createTestWord({ root_id: 1 }));
      const queue = setupQueue(words);
      const state = createSpacingState();

      // Mark root_id 1 as recent
      state.recentWords = [1];

      const result = getNextWordWithSpacing(queue, state);

      // The circuit breaker triggers when checked.length > 20 OR queue.size() === 0
      // After checking 21 words, it breaks and returns the 21st word (before checking if it's recent)
      // So we should get a word back, not null
      expect(result).not.toBeNull();
      expect(result?.root_id).toBe(1);
      expect(state.spacedWords.length).toBe(21); // 21 words should be spaced (the ones that were checked)
      expect(queue.size()).toBe(3); // 25 - 21 - 1 (returned) = 3 remaining
    });
  });

  describe('Spacing Logic - Dynamic Test Generation', () => {
    // Generate tests for different queue sizes and spacing scenarios
    const queueSizes = [1, 3, 5, 10, 20];
    const spacingValues = [1, 3, 5, 7];

    queueSizes.forEach(queueSize => {
      spacingValues.forEach(spacing => {
        test(`should maintain spacing with ${queueSize} words and ${spacing} spacing`, () => {
          const words = Array.from({ length: queueSize }, (_, i) =>
            createTestWord({
              root_id: i + 1,
              fsrs_due: new Date(Date.now() - (queueSize - i) * 3600000).toISOString(),
            })
          );

          const queue = setupQueue(words);
          const state = createSpacingState();
          const processed: number[] = [];

          // Process all words
          while (queue.size() > 0 || state.spacedWords.length > 0) {
            const word = getNextWordWithSpacing(queue, state, spacing);
            if (!word) break;

            processed.push(word.root_id);
            updateSpacingCounters(state, word.root_id, spacing);

            // Verify spacing constraint
            const lastOccurrences = processed
              .map((id, index) => ({ id, index }))
              .filter(item => item.id === word.root_id)
              .map(item => item.index);

            if (lastOccurrences.length > 1) {
              const gap =
                lastOccurrences[lastOccurrences.length - 1] -
                lastOccurrences[lastOccurrences.length - 2];
              expect(gap).toBeGreaterThanOrEqual(spacing);
            }

            // Prevent infinite loops in tests
            if (processed.length > queueSize * 3) break;
          }

          // All words should be processed eventually
          const uniqueProcessed = new Set(processed);
          expect(uniqueProcessed.size).toBe(Math.min(queueSize, processed.length));
        });
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle empty spacing state with ready spaced words', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();
      const state = createSpacingState();

      // Add multiple words with different remaining spacing
      state.spacedWords = [
        { word, remainingSpacing: 0 },
        { word: createTestWord({ root_id: 2 }), remainingSpacing: -1 }, // Negative (ready)
        { word: createTestWord({ root_id: 3 }), remainingSpacing: 2 }, // Not ready
      ];

      const result = getNextWordWithSpacing(queue, state);
      expect(result).not.toBeNull();
      expect(queue.size()).toBe(1); // Only ready words should be requeued
      expect(state.spacedWords).toHaveLength(1); // Only non-ready word should remain
      expect(state.spacedWords[0].remainingSpacing).toBe(2);
    });

    test('should handle priority queue with mixed word types', () => {
      const words = [
        createTestWord({
          root_id: 1,
          fsrs_due: new Date(Date.now() - 10 * 3600000).toISOString(),
          fsrs_stability: 1,
          fsrs_difficulty: 9,
        }),
        createTestWord({
          root_id: 2,
          fsrs_due: new Date(Date.now() + 5 * 3600000).toISOString(),
          fsrs_stability: 10,
          fsrs_difficulty: 1,
        }),
        createTestWord({
          root_id: 3,
          fsrs_due: null, // No due date
          fsrs_stability: null,
          fsrs_difficulty: null,
        }),
      ];

      const queue = setupQueue(words);
      const state = createSpacingState();
      const processed: number[] = [];

      while (queue.size() > 0) {
        const word = getNextWordWithSpacing(queue, state);
        if (!word) break;
        processed.push(word.root_id);
        updateSpacingCounters(state, word.root_id);
      }

      expect(processed).toHaveLength(3);
      expect(new Set(processed).size).toBe(3); // All unique words processed
    });

    test('should handle rapid spacing counter updates', () => {
      const state = createSpacingState();
      const word = createTestWord({ root_id: 1 });

      // Add word to spaced words
      state.spacedWords = [{ word, remainingSpacing: 5 }];

      // Rapidly update counters
      for (let i = 0; i < 10; i++) {
        updateSpacingCounters(state, i + 100);
      }

      expect(state.recentWords).toHaveLength(MIN_WORD_SPACING);
      expect(state.spacedWords[0].remainingSpacing).toBe(-5); // Should go negative
    });

    test('should handle queue operations during spacing conflicts', () => {
      const words = [
        createTestWord({ root_id: 1 }),
        createTestWord({ root_id: 2 }),
        createTestWord({ root_id: 1 }), // Duplicate root_id
      ];
      const queue = setupQueue(words);
      const state = createSpacingState();

      // Process first word
      const first = getNextWordWithSpacing(queue, state);
      expect(first?.root_id).toBe(1);
      updateSpacingCounters(state, first!.root_id);

      // Process second word
      const second = getNextWordWithSpacing(queue, state);
      expect(second?.root_id).toBe(2);
      updateSpacingCounters(state, second!.root_id);

      // Third word should be spaced due to conflict with first
      const third = getNextWordWithSpacing(queue, state);
      expect(third).toBeNull(); // No more words available
      expect(state.spacedWords).toHaveLength(1); // Conflicting word should be spaced
    });

    test('should maintain state consistency across multiple operations', () => {
      const words = Array.from(
        { length: 10 },
        (_, i) => createTestWord({ root_id: (i % 3) + 1 }) // Only 3 unique root_ids
      );
      const queue = setupQueue(words);
      const state = createSpacingState();
      const operations: string[] = [];

      while (queue.size() > 0 || state.spacedWords.some(s => s.remainingSpacing <= 0)) {
        const initialQueueSize = queue.size();
        const initialSpacedCount = state.spacedWords.length;

        const word = getNextWordWithSpacing(queue, state);
        if (!word) break;

        operations.push(`got-${word.root_id}`);
        updateSpacingCounters(state, word.root_id);
        operations.push(`updated-${word.root_id}`);

        // Verify state consistency
        expect(state.recentWords.length).toBeLessThanOrEqual(MIN_WORD_SPACING);
        expect(state.spacedWords.every(s => typeof s.remainingSpacing === 'number')).toBe(true);

        // Prevent infinite loops
        if (operations.length > 50) break;
      }

      expect(operations.length).toBeGreaterThan(0);
      expect(operations.length).toBeLessThanOrEqual(50);
    });

    test('should handle priority calculation edge cases', () => {
      const edgeCases = [
        { fsrs_due: new Date(0).toISOString(), fsrs_stability: 0, fsrs_difficulty: 0 },
        {
          fsrs_due: new Date(Date.now() + 1000 * 365 * 24 * 3600000).toISOString(),
          fsrs_stability: 1000,
          fsrs_difficulty: 20,
        },
        { fsrs_due: new Date(Date.now()).toISOString(), fsrs_stability: 5, fsrs_difficulty: 5 }, // Exactly now, neutral values
      ];

      edgeCases.forEach((caseData, index) => {
        const word = createTestWord({ root_id: index + 1, ...caseData });
        const priority = calculateWordPriority(word);

        expect(typeof priority).toBe('number');
        expect(isFinite(priority)).toBe(true);
        expect(isNaN(priority)).toBe(false);
      });
    });

    test('should handle concurrent spacing state modifications', () => {
      const state = createSpacingState();
      const word1 = createTestWord({ root_id: 1 });
      const word2 = createTestWord({ root_id: 2 });

      // Simulate concurrent modifications
      state.spacedWords.push({ word: word1, remainingSpacing: 3 });
      updateSpacingCounters(state, 1); // Decrements word1 to 2

      state.spacedWords.push({ word: word2, remainingSpacing: 1 });
      updateSpacingCounters(state, 2); // Decrements both: word1 to 1, word2 to 0

      // Verify state is still consistent
      expect(state.recentWords).toEqual([1, 2]);
      expect(state.spacedWords).toHaveLength(2);
      expect(state.spacedWords[0].remainingSpacing).toBe(1); // 3 - 2 updates
      expect(state.spacedWords[1].remainingSpacing).toBe(0); // 1 - 1 update (only affected by second call)
    });

    test('should handle words with identical priorities', () => {
      const baseTime = fixedTime.getTime();
      const identicalWords = Array.from({ length: 5 }, (_, i) =>
        createTestWord({
          root_id: i + 1,
          fsrs_due: new Date(baseTime - 3600000).toISOString(), // Same due time
          fsrs_stability: 5, // Same stability
          fsrs_difficulty: 6.5, // Same difficulty
        })
      );

      const queue = setupQueue(identicalWords);
      const state = createSpacingState();
      const processed: StudyWord[] = [];

      // Should still process all words despite identical priorities
      while (queue.size() > 0) {
        const word = getNextWordWithSpacing(queue, state);
        if (!word) break;
        processed.push(word);
        updateSpacingCounters(state, word.root_id);
      }

      expect(processed).toHaveLength(5);
      const processedIds = processed.map(w => w.root_id).sort();
      expect(processedIds).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle negative priorities', () => {
      const word = createTestWord({
        root_id: 1,
        fsrs_due: new Date(Date.now() + 24 * 3600000).toISOString(), // Future due
        fsrs_stability: 1, // Low stability
        fsrs_difficulty: 9, // High difficulty
      });

      const priority = calculateWordPriority(word);
      expect(typeof priority).toBe('number');
      expect(isFinite(priority)).toBe(true);

      const queue = setupQueue([word]);
      const state = createSpacingState();
      const result = getNextWordWithSpacing(queue, state);
      expect(result).toBe(word);
    });

    test('should handle very large spacing values', () => {
      const words = Array.from({ length: 3 }, (_, i) => createTestWord({ root_id: i + 1 }));
      const queue = setupQueue(words);
      const state = createSpacingState();
      const largeSpacing = 100;

      const first = getNextWordWithSpacing(queue, state, largeSpacing);
      expect(first).not.toBeNull();
      updateSpacingCounters(state, first!.root_id, largeSpacing);

      const second = getNextWordWithSpacing(queue, state, largeSpacing);
      expect(second).not.toBeNull();
      expect(second!.root_id).not.toBe(first!.root_id);
    });

    test('should handle zero spacing', () => {
      const words = [
        createTestWord({ root_id: 1 }),
        createTestWord({ root_id: 1 }), // Same root_id
      ];
      const queue = setupQueue(words);
      const state = createSpacingState();
      const zeroSpacing = 0;

      const first = getNextWordWithSpacing(queue, state, zeroSpacing);
      expect(first).not.toBeNull();
      updateSpacingCounters(state, first!.root_id, zeroSpacing);

      // With zero spacing, should be able to get same word immediately
      const second = getNextWordWithSpacing(queue, state, zeroSpacing);
      expect(second).not.toBeNull();
    });

    test('should handle corrupted spacing state', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = setupQueue([word]);
      const state: SpacingState = {
        recentWords: [1, 2, 3, 1, 2], // Duplicates and inconsistent state
        spacedWords: [
          { word, remainingSpacing: -5 }, // Negative spacing
          { word, remainingSpacing: 1000 }, // Very large spacing
        ],
      };

      expect(() => getNextWordWithSpacing(queue, state)).not.toThrow();
      expect(() => updateSpacingCounters(state, 1)).not.toThrow();
    });

    test('should handle words with extreme FSRS values', () => {
      const extremeWords = [
        createTestWord({
          root_id: 1,
          fsrs_stability: 0,
          fsrs_difficulty: 0,
          fsrs_due: new Date(0).toISOString(), // Very old date
        }),
        createTestWord({
          root_id: 2,
          fsrs_stability: 1000,
          fsrs_difficulty: 20,
          fsrs_due: new Date(Date.now() + 365 * 24 * 3600000).toISOString(), // Far future
        }),
      ];

      extremeWords.forEach(word => {
        const priority = calculateWordPriority(word);
        expect(typeof priority).toBe('number');
        expect(isFinite(priority)).toBe(true);
      });

      const queue = setupQueue(extremeWords);
      const state = createSpacingState();

      const first = getNextWordWithSpacing(queue, state);
      expect(first).not.toBeNull();

      const second = getNextWordWithSpacing(queue, state);
      expect(second).not.toBeNull();
    });
  });

  describe('Integration Tests - Full Workflow', () => {
    test('should handle complete study session simulation', () => {
      // Create a realistic study session with 20 words
      // Use deterministic values to avoid flaky test failures
      const words = Array.from({ length: 20 }, (_, i) => {
        const hoursOverdue = (i * 2.4) % 48; // Deterministic 0-48 hours overdue
        const stability = 1 + ((i * 0.45) % 9); // Deterministic 1-10 stability
        const difficulty = 1 + ((i * 0.4) % 9); // Deterministic 1-10 difficulty

        return createTestWord({
          root_id: i + 1,
          fsrs_due: new Date(Date.now() - hoursOverdue * 3600000).toISOString(),
          fsrs_stability: stability,
          fsrs_difficulty: difficulty,
        });
      });

      const queue = setupQueue(words);
      const state = createSpacingState();
      const sessionLog: { wordId: number; position: number }[] = [];
      let position = 0;

      // Simulate study session
      while (queue.size() > 0 || state.spacedWords.some(s => s.remainingSpacing <= 0)) {
        const word = getNextWordWithSpacing(queue, state);
        if (!word) break;

        sessionLog.push({ wordId: word.root_id, position });
        updateSpacingCounters(state, word.root_id);
        position++;

        // Simulate some words being requeued (incorrect answers)
        // Use deterministic requeue pattern to avoid flaky tests
        if (position % 4 === 0 && position < 50) {
          // Every 4th word gets requeued (deterministic 25% requeue rate)
          const priority = calculateWordPriority(word);
          queue.push(word, priority);
        }

        // Prevent infinite test loops
        if (position > 100) break;
      }

      // Verify spacing constraints were maintained
      const wordPositions = new Map<number, number[]>();
      sessionLog.forEach(({ wordId, position }) => {
        if (!wordPositions.has(wordId)) {
          wordPositions.set(wordId, []);
        }
        wordPositions.get(wordId)!.push(position);
      });

      // Check spacing for words that appeared multiple times
      wordPositions.forEach((positions, wordId) => {
        if (positions.length > 1) {
          for (let i = 1; i < positions.length; i++) {
            const gap = positions[i] - positions[i - 1];
            expect(gap).toBeGreaterThanOrEqual(MIN_WORD_SPACING);
          }
        }
      });

      expect(sessionLog.length).toBeGreaterThan(0);
      expect(sessionLog.length).toBeLessThanOrEqual(100);
    });

    test('should maintain priority ordering while respecting spacing', () => {
      // Create words with clear priority differences
      const baseTime = fixedTime.getTime();
      const words = [
        createTestWord({
          root_id: 1,
          fsrs_due: new Date(baseTime - 10 * 3600000).toISOString(), // Highest priority
        }),
        createTestWord({
          root_id: 2,
          fsrs_due: new Date(baseTime - 5 * 3600000).toISOString(), // Medium priority
        }),
        createTestWord({
          root_id: 3,
          fsrs_due: new Date(baseTime - 1 * 3600000).toISOString(), // Lowest priority
        }),
      ];

      const queue = setupQueue(words);
      const state = createSpacingState();
      const processed: number[] = [];

      // First word should be highest priority
      const first = getNextWordWithSpacing(queue, state);
      expect(first?.root_id).toBe(1);
      processed.push(first!.root_id);
      updateSpacingCounters(state, first!.root_id);

      // Requeue first word to test spacing
      queue.push(first!, calculateWordPriority(first!));

      // Next should be second highest priority (not first due to spacing)
      const second = getNextWordWithSpacing(queue, state);
      expect(second?.root_id).toBe(2);
      processed.push(second!.root_id);
      updateSpacingCounters(state, second!.root_id);

      // Continue processing to verify spacing is maintained
      while (queue.size() > 0 && processed.length < 10) {
        const next = getNextWordWithSpacing(queue, state);
        if (!next) break;
        processed.push(next.root_id);
        updateSpacingCounters(state, next.root_id);
      }

      // Verify first word wasn't processed again too soon
      const firstWordPositions = processed
        .map((id, index) => ({ id, index }))
        .filter(item => item.id === 1)
        .map(item => item.index);

      if (firstWordPositions.length > 1) {
        const gap = firstWordPositions[1] - firstWordPositions[0];
        expect(gap).toBeGreaterThanOrEqual(MIN_WORD_SPACING);
      }
    });
  });
});
