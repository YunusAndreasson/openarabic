/**
 * FSRS Spacing Tests
 *
 * Tests spaced repetition word spacing logic for vocabulary practice.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

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
    test('should create empty spacing state', () => {
      const state = createSpacingState();
      expect(state.recentWords.size).toBe(0);
      expect(state.recentWordsQueue).toEqual([]);
      expect(state.spacedWords).toEqual([]);
    });

    test('should create new state instance each time', () => {
      const state1 = createSpacingState();
      const state2 = createSpacingState();
      expect(state1).not.toBe(state2);
      expect(state1.recentWords).not.toBe(state2.recentWords);
    });
  });

  describe('calculateWordPriority', () => {
    test('should calculate priority for normal word', () => {
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

    test('should prioritize struggling words higher (lower priority number)', () => {
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

    test('should prioritize overdue words higher', () => {
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

    test('should handle words with null due date', () => {
      const word = createTestWord({
        fsrs_due: null,
        fsrs_stability: 5,
      });

      const priority = calculateWordPriority(word);
      expect(typeof priority).toBe('number');
      expect(isNaN(priority)).toBeFalsy();
    });

    test('should calculate different priorities for different stability values', () => {
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

    test('should factor in lapses for priority calculation', () => {
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

    test('should handle null stability with default value', () => {
      const word = createTestWord({
        fsrs_stability: null,
        fsrs_due: new Date().toISOString(),
      });

      const priority = calculateWordPriority(word);
      expect(typeof priority).toBe('number');
      expect(isNaN(priority)).toBeFalsy();
    });

    test('should handle null difficulty with default value', () => {
      const word = createTestWord({
        fsrs_difficulty: null,
        fsrs_due: new Date().toISOString(),
      });

      const priority = calculateWordPriority(word);
      expect(typeof priority).toBe('number');
      expect(isNaN(priority)).toBeFalsy();
    });

    test('should handle null lapses with default value', () => {
      const word = createTestWord({
        fsrs_lapses: null,
        fsrs_due: new Date().toISOString(),
      });

      const priority = calculateWordPriority(word);
      expect(typeof priority).toBe('number');
      expect(isNaN(priority)).toBeFalsy();
    });

    test('should handle words not yet due (future due date)', () => {
      const futureWord = createTestWord({
        fsrs_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
        fsrs_stability: 5,
      });

      const dueNowWord = createTestWord({
        fsrs_due: new Date().toISOString(),
        fsrs_stability: 5,
      });

      const futurePriority = calculateWordPriority(futureWord);
      const dueNowPriority = calculateWordPriority(dueNowWord);

      // Future word should have higher priority number (less urgent)
      expect(futurePriority).toBeGreaterThan(dueNowPriority);
    });

    test('should give very overdue words high priority (low number)', () => {
      const veryOverdueWord = createTestWord({
        fsrs_due: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days overdue
        fsrs_stability: 5,
        fsrs_difficulty: 6.5,
      });

      const priority = calculateWordPriority(veryOverdueWord);
      // Very overdue word should have low priority number (urgent)
      expect(priority).toBeLessThan(10); // Base priority is 10
    });

    test('should calculate priority for new word with no FSRS data', () => {
      const newWord = createTestWord({
        fsrs_due: null,
        fsrs_stability: null,
        fsrs_difficulty: null,
        fsrs_lapses: null,
        fsrs_reps: 0,
      });

      const priority = calculateWordPriority(newWord);
      expect(typeof priority).toBe('number');
      expect(isNaN(priority)).toBeFalsy();
    });
  });

  describe('updateSpacingCounters', () => {
    test('should add word to recentWords', () => {
      const state = createSpacingState();
      updateSpacingCounters(state, 1, MIN_WORD_SPACING);

      expect(state.recentWords.has(1)).toBeTruthy();
      expect(state.recentWordsQueue).toEqual([1]);
    });

    test('should maintain max length of recentWords array', () => {
      const state = createSpacingState();
      const minSpacing = 3;

      // Add more words than minSpacing
      updateSpacingCounters(state, 1, minSpacing);
      updateSpacingCounters(state, 2, minSpacing);
      updateSpacingCounters(state, 3, minSpacing);
      updateSpacingCounters(state, 4, minSpacing); // Should remove first

      expect(state.recentWordsQueue).toEqual([2, 3, 4]);
      expect(state.recentWords.size).toBe(minSpacing);
      expect(state.recentWords.has(1)).toBeFalsy();
      expect(state.recentWords.has(2)).toBeTruthy();
    });

    test('should decrement remainingSpacing for all spacedWords', () => {
      const state: SpacingState = {
        recentWords: new Set(),
        recentWordsQueue: [],
        spacedWords: [
          { word: createTestWord({ root_id: 1 }), remainingSpacing: 3 },
          { word: createTestWord({ root_id: 2 }), remainingSpacing: 2 },
        ],
      };

      updateSpacingCounters(state, 10, MIN_WORD_SPACING);

      expect(state.spacedWords[0].remainingSpacing).toBe(2);
      expect(state.spacedWords[1].remainingSpacing).toBe(1);
    });

    test('should handle empty spacedWords array', () => {
      const state = createSpacingState();
      expect(() => updateSpacingCounters(state, 1, MIN_WORD_SPACING)).not.toThrow();
    });

    test('should allow negative remainingSpacing values', () => {
      const state: SpacingState = {
        recentWords: new Set(),
        recentWordsQueue: [],
        spacedWords: [{ word: createTestWord({ root_id: 1 }), remainingSpacing: 0 }],
      };

      updateSpacingCounters(state, 10, MIN_WORD_SPACING);

      // Should decrement even below 0
      expect(state.spacedWords[0].remainingSpacing).toBe(-1);
    });

    test('should work with minSpacing of 1', () => {
      const state = createSpacingState();

      updateSpacingCounters(state, 1, 1);
      expect(state.recentWordsQueue).toEqual([1]);

      updateSpacingCounters(state, 2, 1);
      expect(state.recentWordsQueue).toEqual([2]); // Only keeps last 1
      expect(state.recentWords.has(1)).toBeFalsy();
      expect(state.recentWords.has(2)).toBeTruthy();
    });

    test('should work with minSpacing of 0', () => {
      const state = createSpacingState();

      updateSpacingCounters(state, 1, 0);
      expect(state.recentWordsQueue).toEqual([]); // Immediately shifted out
      expect(state.recentWords.size).toBe(0);
    });
  });

  describe('getNextWordWithSpacing', () => {
    test('should return next word from queue when not in recentWords', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();
      queue.push(word, calculateWordPriority(word));

      const state = createSpacingState();
      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord).toBe(word);
      expect(nextWord?.root_id).toBe(1);
    });

    test('should skip word if in recentWords and return next available', () => {
      const word1 = createTestWord({ root_id: 1 });
      const word2 = createTestWord({ root_id: 2 });

      const queue = new PriorityQueue<StudyWord>();
      queue.push(word1, calculateWordPriority(word1));
      queue.push(word2, calculateWordPriority(word2));

      const state = createSpacingState();
      state.recentWords.add(1); // Mark word1 as recent
      state.recentWordsQueue.push(1);

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord?.root_id).toBe(2);
      expect(state.spacedWords.length).toBe(1); // word1 should be in spacedWords
      expect(state.spacedWords[0].word.root_id).toBe(1);
    });

    test('should return null when queue is empty', () => {
      const queue = new PriorityQueue<StudyWord>();
      const state = createSpacingState();

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord).toBeNull();
    });

    test('should add words with remainingSpacing to spacedWords', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();
      queue.push(word, calculateWordPriority(word));

      const state = createSpacingState();
      state.recentWords.add(1); // Mark as recent
      state.recentWordsQueue.push(1);

      const nextWord = getNextWordWithSpacing(queue, state, 5);

      expect(nextWord).toBeNull(); // No more words in queue
      expect(state.spacedWords.length).toBe(1);
      expect(state.spacedWords[0].remainingSpacing).toBe(5);
    });

    test('should re-add ready spacedWords to queue', () => {
      const word1 = createTestWord({ root_id: 1 });
      const word2 = createTestWord({ root_id: 2 });

      const queue = new PriorityQueue<StudyWord>();
      queue.push(word2, calculateWordPriority(word2));

      const state: SpacingState = {
        recentWords: new Set(),
        recentWordsQueue: [],
        spacedWords: [{ word: word1, remainingSpacing: 0 }], // Ready to be re-added
      };

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      // Should return one of the words (either from spacedWords or original queue)
      expect(nextWord).toBeTruthy();
      expect([1, 2]).toContain(nextWord?.root_id);

      // spacedWords should be cleared of ready items
      expect(state.spacedWords.length).toBe(0);
    });

    test('should handle iteration limit to prevent infinite loops', () => {
      // Create many words all marked as recent
      const queue = new PriorityQueue<StudyWord>();
      const recentWordsSet = new Set<number>();
      const recentWordsQueue: number[] = [];

      for (let i = 1; i <= 100; i++) {
        const word = createTestWord({ root_id: i });
        queue.push(word, calculateWordPriority(word));
        recentWordsSet.add(i);
        recentWordsQueue.push(i);
      }

      const state: SpacingState = {
        recentWords: recentWordsSet,
        recentWordsQueue,
        spacedWords: [],
      };

      // Should stop after iteration limit
      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      // Should have added words to spacedWords (up to iteration limit)
      // The function will return the last word popped after breaking
      expect(state.spacedWords.length).toBeGreaterThan(0);
      expect(state.spacedWords.length).toBeLessThanOrEqual(22); // Iteration limit + buffer
    });

    test('should return ready spacedWord when queue is empty', () => {
      const readyWord = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();

      const state: SpacingState = {
        recentWords: new Set(),
        recentWordsQueue: [],
        spacedWords: [{ word: readyWord, remainingSpacing: 0 }],
      };

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord?.root_id).toBe(1);
      expect(state.spacedWords.length).toBe(0);
    });

    test('should handle multiple ready spacedWords simultaneously', () => {
      const word1 = createTestWord({
        root_id: 1,
        fsrs_due: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      }); // More overdue
      const word2 = createTestWord({ root_id: 2, fsrs_due: new Date().toISOString() });
      const word3 = createTestWord({ root_id: 3 });

      const queue = new PriorityQueue<StudyWord>();
      queue.push(word3, calculateWordPriority(word3));

      const state: SpacingState = {
        recentWords: new Set(),
        recentWordsQueue: [],
        spacedWords: [
          { word: word1, remainingSpacing: -2 }, // Very ready
          { word: word2, remainingSpacing: 0 }, // Ready
        ],
      };

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      // Should return a word (priority determines which)
      expect(nextWord).toBeTruthy();
      expect([1, 2, 3]).toContain(nextWord?.root_id);

      // All ready spacedWords should be cleared
      expect(state.spacedWords.length).toBe(0);
    });

    test('should not return spacedWords that are not ready', () => {
      const queueWord = createTestWord({ root_id: 1 });
      const spacedWord = createTestWord({ root_id: 2 });

      const queue = new PriorityQueue<StudyWord>();
      queue.push(queueWord, calculateWordPriority(queueWord));

      const state: SpacingState = {
        recentWords: new Set(),
        recentWordsQueue: [],
        spacedWords: [{ word: spacedWord, remainingSpacing: 5 }], // Not ready
      };

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord?.root_id).toBe(1); // From queue
      expect(state.spacedWords.length).toBe(1); // Spaced word still waiting
      expect(state.spacedWords[0].remainingSpacing).toBe(5);
    });

    test('should preserve priority order from queue', () => {
      const highPriorityWord = createTestWord({
        root_id: 1,
        fsrs_due: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        fsrs_lapses: 5,
      });
      const lowPriorityWord = createTestWord({
        root_id: 2,
        fsrs_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        fsrs_lapses: 0,
      });

      const queue = new PriorityQueue<StudyWord>();
      // Add in reverse order to test priority sorting
      queue.push(lowPriorityWord, calculateWordPriority(lowPriorityWord));
      queue.push(highPriorityWord, calculateWordPriority(highPriorityWord));

      const state = createSpacingState();

      const firstWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);
      expect(firstWord?.root_id).toBe(1); // High priority word first
    });

    test('should work with single word in queue marked as recent', () => {
      const word = createTestWord({ root_id: 1 });
      const queue = new PriorityQueue<StudyWord>();
      queue.push(word, calculateWordPriority(word));

      const state: SpacingState = {
        recentWords: new Set([1]), // Same word is recent
        recentWordsQueue: [1],
        spacedWords: [],
      };

      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      // Should return null since only word is recent
      expect(nextWord).toBeNull();
      // Word should be added to spacedWords
      expect(state.spacedWords.length).toBe(1);
      expect(state.spacedWords[0].word.root_id).toBe(1);
    });
  });
});
