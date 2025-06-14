import { createTestWord, createWordSet, testPatterns } from '../helpers/fsrsTestHelpers';
import { calculateWordPriority } from '../../utils/fsrsSpacing';
import { PriorityQueue } from '../../utils/priorityQueue';

// We need to test the priority calculation logic directly
// Since it's internal to useFSRS, we'll test it through the queue ordering behavior

describe('FSRS Priority Calculation Logic', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // Test the mathematical priority calculation
  describe('Priority Formula Validation', () => {
    test('calculates correct priority values for different scenarios', () => {
      const now = new Date();

      // Test overdue calculation (primary factor)
      const overdueWord = createTestWord({
        root_id: 1,
        fsrs_due: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(), // 24 hours overdue
        fsrs_stability: 5,
        fsrs_difficulty: 6.5,
      });

      const dueNowWord = createTestWord({
        root_id: 2,
        fsrs_due: now.toISOString(), // Due now
        fsrs_stability: 5,
        fsrs_difficulty: 6.5,
      });

      const futureWord = createTestWord({
        root_id: 3,
        fsrs_due: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(), // Due in 24 hours
        fsrs_stability: 5,
        fsrs_difficulty: 6.5,
      });

      const overduePriority = calculateWordPriority(overdueWord);
      const dueNowPriority = calculateWordPriority(dueNowWord);
      const futurePriority = calculateWordPriority(futureWord);

      // More overdue words should have lower priority values
      expect(overduePriority).toBeLessThan(dueNowPriority);
      expect(dueNowPriority).toBeLessThan(futurePriority);
    });

    test('stability factor affects priority correctly', () => {
      const now = new Date();

      const unstableWord = createTestWord({
        root_id: 1,
        fsrs_due: now.toISOString(),
        fsrs_stability: 1, // Very unstable
        fsrs_difficulty: 6.5,
      });

      const stableWord = createTestWord({
        root_id: 2,
        fsrs_due: now.toISOString(),
        fsrs_stability: 10, // Very stable
        fsrs_difficulty: 6.5,
      });

      // Stability factor = Math.max(0, 10 - stability) * 0.1
      // Unstable: Math.max(0, 10 - 1) * 0.1 = 0.9
      // Stable: Math.max(0, 10 - 10) * 0.1 = 0.0
      const unstablePriority = calculateWordPriority(unstableWord);
      const stablePriority = calculateWordPriority(stableWord);

      // Higher stability results in lower numeric priority
      expect(stablePriority).toBeLessThan(unstablePriority);
    });

    test('difficulty factor provides minor priority adjustment', () => {
      const now = new Date();

      const hardWord = createTestWord({
        root_id: 1,
        fsrs_due: now.toISOString(),
        fsrs_stability: 5,
        fsrs_difficulty: 8.0, // Hard
      });

      const easyWord = createTestWord({
        root_id: 2,
        fsrs_due: now.toISOString(),
        fsrs_stability: 5,
        fsrs_difficulty: 5.0, // Easy
      });

      // Difficulty factor = (difficulty - 5) * 0.01
      // Hard: (8.0 - 5) * 0.01 = 0.03
      // Easy: (5.0 - 5) * 0.01 = 0.00
      const hardPriority = calculateWordPriority(hardWord);
      const easyPriority = calculateWordPriority(easyWord);

      // Harder words result in a slightly higher priority value
      expect(hardPriority).toBeGreaterThan(easyPriority);
    });
  });

  describe('Priority Edge Cases', () => {
    test('handles null/undefined FSRS values gracefully', () => {
      const wordWithNulls = createTestWord({
        root_id: 1,
        fsrs_due: null,
        fsrs_stability: null,
        fsrs_difficulty: null,
      });

      // Should use default values without crashing
      // fsrs_due: null -> should default to now
      // fsrs_stability: null -> should default to 1
      // fsrs_difficulty: null -> should default to 6.5
      const priority = calculateWordPriority(wordWithNulls);
      expect(typeof priority).toBe('number');
      expect(isFinite(priority)).toBe(true);
    });

    test('handles extreme values correctly', () => {
      const extremeWord = createTestWord({
        root_id: 1,
        fsrs_due: new Date('1970-01-01').toISOString(), // Very overdue
        fsrs_stability: 999, // Extremely stable
        fsrs_difficulty: 15, // Beyond normal range
      });

      const priority = calculateWordPriority(extremeWord);
      expect(priority).toBeLessThan(0);
      expect(isFinite(priority)).toBe(true);
    });

    test('handles invalid date strings', () => {
      const invalidDateWord = createTestWord({
        root_id: 1,
        fsrs_due: 'invalid-date-string',
        fsrs_stability: 5,
        fsrs_difficulty: 6.5,
      });

      const priority = calculateWordPriority(invalidDateWord);
      expect(isNaN(priority)).toBe(true);
    });
  });

  describe('Priority Consistency', () => {
    test('maintains consistent ordering across multiple calculations', () => {
      // Create a set of words with known priority relationships
      const words = createWordSet([
        { id: 1, hoursOverdue: 48, stability: 2, difficulty: 8.0 }, // Highest priority
        { id: 2, hoursOverdue: 24, stability: 5, difficulty: 6.5 }, // High priority
        { id: 3, hoursOverdue: 12, stability: 8, difficulty: 5.0 }, // Medium priority
        { id: 4, hoursOverdue: 0, stability: 10, difficulty: 6.0 }, // Low priority
        { id: 5, hoursOverdue: -12, stability: 15, difficulty: 5.5 }, // Lowest priority (future)
      ]);

      const priorities = words.map(w => ({ id: w.root_id, p: calculateWordPriority(w) }));
      const ordered = [...priorities].sort((a, b) => a.p - b.p).map(p => p.id);
      expect(ordered).toEqual([1, 2, 3, 4, 5]);
    });

    test('handles identical priority values with stable ordering', () => {
      // Create words with identical priority factors
      const identicalWords = createWordSet([
        { id: 1, hoursOverdue: 24, stability: 5, difficulty: 6.5 },
        { id: 2, hoursOverdue: 24, stability: 5, difficulty: 6.5 },
        { id: 3, hoursOverdue: 24, stability: 5, difficulty: 6.5 },
      ]);

      const priorities = identicalWords.map(calculateWordPriority);
      expect(priorities[0]).toBeCloseTo(priorities[1]);
      expect(priorities[1]).toBeCloseTo(priorities[2]);
    });
  });

  describe('Priority Performance', () => {
    test('calculates priorities for large datasets without errors', () => {
      const largeWordSet = Array.from({ length: 1000 }, (_, i) =>
        createTestWord({
          root_id: i + 1,
          fsrs_due: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          fsrs_stability: Math.random() * 10 + 1,
          fsrs_difficulty: Math.random() * 5 + 5,
        })
      );

      const priorities = largeWordSet.map(calculateWordPriority);

      expect(priorities.every(p => typeof p === 'number')).toBe(true);
      expect(priorities).toHaveLength(1000);
    });
  });

  describe('Real-world Priority Scenarios', () => {
    test('prioritizes struggling words correctly', () => {
      const strugglingWord = createTestWord({
        root_id: 1,
        fsrs_due: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // 12 hours overdue
        fsrs_stability: 2, // Low stability (struggling)
        fsrs_difficulty: 8.5, // High difficulty
        fsrs_lapses: 3, // Multiple failures
      });

      const masteredWord = createTestWord({
        root_id: 2,
        fsrs_due: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // 6 hours overdue
        fsrs_stability: 15, // High stability (mastered)
        fsrs_difficulty: 5.5, // Low difficulty
        fsrs_lapses: 0, // No failures
      });

      const strugglingPriority = calculateWordPriority(strugglingWord);
      const masteredPriority = calculateWordPriority(masteredWord);

      expect(strugglingPriority).toBeLessThan(masteredPriority);
    });

    test('balances new vs review words appropriately', () => {
      const newWord = createTestWord({
        root_id: 1,
        fsrs_due: new Date().toISOString(), // Due now
        fsrs_stability: 0, // New word
        fsrs_difficulty: 6.5, // Default difficulty
        fsrs_state: 0, // New state
        fsrs_reps: 0,
      });

      const reviewWord = createTestWord({
        root_id: 2,
        fsrs_due: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours overdue
        fsrs_stability: 7, // Established stability
        fsrs_difficulty: 6.0, // Learned difficulty
        fsrs_state: 2, // Review state
        fsrs_reps: 5,
      });

      const newPriority = calculateWordPriority(newWord);
      const reviewPriority = calculateWordPriority(reviewWord);

      expect(reviewPriority).toBeLessThan(newPriority);
    });
  });
});

// Integration test with actual priority queue behavior
describe('Priority Queue Integration', () => {
  test('priority queue maintains correct order after insertions', () => {
    const caseData = testPatterns.priorityTestCases[0];
    const words = createWordSet(caseData.words);
    const queue = new PriorityQueue<typeof words[0]>();
    words.forEach(w => queue.push(w, calculateWordPriority(w)));

    const order: number[] = [];
    while (!queue.isEmpty()) {
      order.push(queue.pop()!.root_id);
    }

    expect(order).toEqual(caseData.expectedOrder);
  });

  test('requeued words get appropriate spacing priority', () => {
    const wordA = createTestWord({ root_id: 1, fsrs_due: new Date(Date.now() - 2 * 3600 * 1000).toISOString() });
    const wordB = createTestWord({ root_id: 2, fsrs_due: new Date(Date.now() - 1 * 3600 * 1000).toISOString() });

    const queue = new PriorityQueue<typeof wordA>();
    queue.push(wordA, calculateWordPriority(wordA));
    queue.push(wordB, calculateWordPriority(wordB));

    const first = queue.pop()!;
    const penalty = 2; // simulate spacing penalty
    queue.push(first, calculateWordPriority(first) + penalty);
    queue.push(wordB, calculateWordPriority(wordB));

    const order: number[] = [];
    while (!queue.isEmpty()) {
      order.push(queue.pop()!.root_id);
    }

    expect(order[0]).toBe(2);
  });

  test('words with invalid due date are skipped in queue ordering', () => {
    const validEarly = createTestWord({
      root_id: 1,
      fsrs_due: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    });

    const invalidWord = createTestWord({ root_id: 2, fsrs_due: 'not-a-date' });

    const validLate = createTestWord({ root_id: 3, fsrs_due: new Date().toISOString() });

    const queue = new PriorityQueue<typeof validEarly>();
    queue.push(validEarly, calculateWordPriority(validEarly));
    queue.push(invalidWord, calculateWordPriority(invalidWord));
    queue.push(validLate, calculateWordPriority(validLate));

    const priorityInvalid = calculateWordPriority(invalidWord);
    expect(isNaN(priorityInvalid)).toBe(true);

    const order: number[] = [];
    while (!queue.isEmpty()) {
      order.push(queue.pop()!.root_id);
    }

    expect(order).toEqual([1, 3, 2]);
  });
});
