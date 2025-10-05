import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { MIN_WORD_SPACING } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateWordPriority,
  createSpacingState,
  getNextWordWithSpacing,
  type SpacingState,
  updateSpacingCounters,
} from '@/utils/fsrsSpacing';
import { PriorityQueue } from '@/utils/priorityQueue';

describe('fsrsSpacing', () => {
  describe('createSpacingState', () => {
    it('should create empty spacing state', () => {
      const state = createSpacingState();
      expect(state.recentWords).toEqual([]);
      expect(state.spacedWords).toEqual([]);
    });

    it('should create new state instance each time', () => {
      const state1 = createSpacingState();
      const state2 = createSpacingState();
      expect(state1).not.toBe(state2);
      expect(state1.recentWords).not.toBe(state2.recentWords);
    });
  });

  describe('calculateWordPriority', () => {
    it('should calculate priority for normal word', () => {
      const word = createTestWord({
        fsrs_due: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day overdue
        fsrs_stability: 5,
        fsrs_difficulty: 6.5,
        fsrs_lapses: 1,
      });

      const priority = calculateWordPriority(word);
      expect(typeof priority).toBe('number');
      expect(priority).toBeLessThan(15); // Base priority is 10, should be modified
    });

    it('should prioritize struggling words higher (lower priority number)', () => {
      const strugglingWord = createTestWord({
        fsrs_difficulty: 8.5,
        fsrs_lapses: 3,
        fsrs_reps: 5,
        fsrs_stability: 2,
      });

      const normalWord = createTestWord({
        fsrs_difficulty: 5.0,
        fsrs_lapses: 0,
        fsrs_reps: 5,
        fsrs_stability: 5,
      });

      const strugglingPriority = calculateWordPriority(strugglingWord);
      const normalPriority = calculateWordPriority(normalWord);

      // Lower priority number = higher priority
      expect(strugglingPriority).toBeLessThan(normalPriority);
    });

    it('should prioritize overdue words higher', () => {
      const overdueWord = createTestWord({
        fsrs_due: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days overdue
        fsrs_stability: 5,
      });

      const onTimeWord = createTestWord({
        fsrs_due: new Date().toISOString(), // Due now
        fsrs_stability: 5,
      });

      const overduePriority = calculateWordPriority(overdueWord);
      const onTimePriority = calculateWordPriority(onTimeWord);

      expect(overduePriority).toBeLessThan(onTimePriority);
    });

    it('should handle words with null due date', () => {
      const word = createTestWord({
        fsrs_due: null,
        fsrs_stability: 5,
      });

      const priority = calculateWordPriority(word);
      expect(typeof priority).toBe('number');
      expect(isNaN(priority)).toBe(false);
    });

    it('should calculate different priorities for different stability values', () => {
      const lowStabilityWord = createTestWord({
        fsrs_stability: 1,
        fsrs_due: new Date().toISOString(),
        fsrs_lapses: 0,
        fsrs_difficulty: 6.5,
      });

      const highStabilityWord = createTestWord({
        fsrs_stability: 10,
        fsrs_due: new Date().toISOString(),
        fsrs_lapses: 0,
        fsrs_difficulty: 6.5,
      });

      const lowPriority = calculateWordPriority(lowStabilityWord);
      const highPriority = calculateWordPriority(highStabilityWord);

      // Both should be valid numbers
      expect(typeof lowPriority).toBe('number');
      expect(typeof highPriority).toBe('number');
      // Stability affects the priority calculation
      expect(lowPriority).not.toBe(highPriority);
    });

    it('should factor in lapses for priority calculation', () => {
      const manyLapsesWord = createTestWord({
        fsrs_lapses: 5,
        fsrs_stability: 5,
      });

      const noLapsesWord = createTestWord({
        fsrs_lapses: 0,
        fsrs_stability: 5,
      });

      const manyLapsesPriority = calculateWordPriority(manyLapsesWord);
      const noLapsesPriority = calculateWordPriority(noLapsesWord);

      expect(manyLapsesPriority).toBeLessThan(noLapsesPriority);
    });
  });

  describe('updateSpacingCounters', () => {
    it('should add word to recentWords', () => {
      const state = createSpacingState();
      updateSpacingCounters(state, 1, MIN_WORD_SPACING);

      expect(state.recentWords).toEqual([1]);
    });

    it('should maintain max length of recentWords array', () => {
      const state = createSpacingState();
      const minSpacing = 3;

      // Add more words than minSpacing
      updateSpacingCounters(state, 1, minSpacing);
      updateSpacingCounters(state, 2, minSpacing);
      updateSpacingCounters(state, 3, minSpacing);
      updateSpacingCounters(state, 4, minSpacing); // Should remove first

      expect(state.recentWords).toEqual([2, 3, 4]);
      expect(state.recentWords.length).toBe(minSpacing);
    });

    it('should decrement remainingSpacing for all spacedWords', () => {
      const state: SpacingState = {
        recentWords: [],
        spacedWords: [
          { word: createTestWord({ root_id: 1 }), remainingSpacing: 3 },
          { word: createTestWord({ root_id: 2 }), remainingSpacing: 2 },
        ],
      };

      updateSpacingCounters(state, 10, MIN_WORD_SPACING);

      expect(state.spacedWords[0].remainingSpacing).toBe(2);
      expect(state.spacedWords[1].remainingSpacing).toBe(1);
    });

    it('should handle empty spacedWords array', () => {
      const state = createSpacingState();
      expect(() => updateSpacingCounters(state, 1, MIN_WORD_SPACING)).not.toThrow();
    });
  });

  describe('getNextWordWithSpacing', () => {
    it('should return next word from queue when not in recentWords', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();
      queue.push(word, calculateWordPriority(word));

      const state = createSpacingState();
      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord).toBe(word);
      expect(nextWord?.root_id).toBe(1);
    });

    it('should skip word if in recentWords and return next available', () => {
      const word1 = createTestWord({ root_id: 1 });
      const word2 = createTestWord({ root_id: 2 });

      const queue = new PriorityQueue<StudyWord>();
      queue.push(word1, calculateWordPriority(word1));
      queue.push(word2, calculateWordPriority(word2));

      const state = createSpacingState();
      state.recentWords = [1]; // Mark word1 as recent

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord?.root_id).toBe(2);
      expect(state.spacedWords.length).toBe(1); // word1 should be in spacedWords
      expect(state.spacedWords[0].word.root_id).toBe(1);
    });

    it('should return null when queue is empty', () => {
      const queue = new PriorityQueue<StudyWord>();
      const state = createSpacingState();

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord).toBeNull();
    });

    it('should add words with remainingSpacing to spacedWords', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();
      queue.push(word, calculateWordPriority(word));

      const state = createSpacingState();
      state.recentWords = [1]; // Mark as recent

      const nextWord = getNextWordWithSpacing(queue, state, 5);

      expect(nextWord).toBeNull(); // No more words in queue
      expect(state.spacedWords.length).toBe(1);
      expect(state.spacedWords[0].remainingSpacing).toBe(5);
    });

    it('should re-add ready spacedWords to queue', () => {
      const word1 = createTestWord({ root_id: 1 });
      const word2 = createTestWord({ root_id: 2 });

      const queue = new PriorityQueue<StudyWord>();
      queue.push(word2, calculateWordPriority(word2));

      const state: SpacingState = {
        recentWords: [],
        spacedWords: [{ word: word1, remainingSpacing: 0 }], // Ready to be re-added
      };

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      // Should return one of the words (either from spacedWords or original queue)
      expect(nextWord).toBeTruthy();
      expect([1, 2]).toContain(nextWord?.root_id);

      // spacedWords should be cleared of ready items
      expect(state.spacedWords.length).toBe(0);
    });

    it('should handle iteration limit to prevent infinite loops', () => {
      // Create many words all marked as recent
      const queue = new PriorityQueue<StudyWord>();
      const recentWords: number[] = [];

      for (let i = 1; i <= 100; i++) {
        const word = createTestWord({ root_id: i });
        queue.push(word, calculateWordPriority(word));
        recentWords.push(i);
      }

      const state: SpacingState = {
        recentWords,
        spacedWords: [],
      };

      // Should stop after iteration limit
      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      // Should have added words to spacedWords (up to iteration limit)
      // The function will return the last word popped after breaking
      expect(state.spacedWords.length).toBeGreaterThan(0);
      expect(state.spacedWords.length).toBeLessThanOrEqual(22); // Iteration limit + buffer
    });
  });
});
