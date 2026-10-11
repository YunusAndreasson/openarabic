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
  partitionSessionChunk,
  type SpacingState,
  updateSpacingCounters,
} from '@/utils/fsrsSpacing';
import { PriorityQueue } from '@/utils/priorityQueue';
import { rootId } from '@/__tests__/helpers/ids';

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
          { word: createTestWord({ root_id: rootId(1) }), remainingSpacing: 3 },
          { word: createTestWord({ root_id: rootId(2) }), remainingSpacing: 2 },
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
        spacedWords: [{ word: createTestWord({ root_id: rootId(1) }), remainingSpacing: 0 }],
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
      const word = createTestWord({ root_id: rootId(1) });
      const queue = new PriorityQueue<StudyWord>();
      queue.push(word, calculateWordPriority(word));

      const state = createSpacingState();
      const nextWord = getNextWordWithSpacing(queue, state, MIN_WORD_SPACING);

      expect(nextWord).toBe(word);
      expect(nextWord?.root_id).toBe(1);
    });

    test('should skip word if in recentWords and return next available', () => {
      const word1 = createTestWord({ root_id: rootId(1) });
      const word2 = createTestWord({ root_id: rootId(2) });

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
      const word = createTestWord({ root_id: rootId(1) });
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
      const word1 = createTestWord({ root_id: rootId(1) });
      const word2 = createTestWord({ root_id: rootId(2) });

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
        const word = createTestWord({ root_id: rootId(i) });
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
      const readyWord = createTestWord({ root_id: rootId(1) });
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
        root_id: rootId(1),
        fsrs_due: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      }); // More overdue
      const word2 = createTestWord({ root_id: rootId(2), fsrs_due: new Date().toISOString() });
      const word3 = createTestWord({ root_id: rootId(3) });

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

      // A ready re-ask outranks the heap, and the longest-waiting one goes
      // first; the other stays buffered for the next pick.
      expect(nextWord?.root_id).toBe(1);
      expect(state.spacedWords.map(item => item.word.root_id)).toEqual([2]);
      expect(queue.size()).toBe(1);
    });

    test('should not return spacedWords that are not ready', () => {
      const queueWord = createTestWord({ root_id: rootId(1) });
      const spacedWord = createTestWord({ root_id: rootId(2) });

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
        root_id: rootId(1),
        fsrs_due: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        fsrs_state: 1,
      });
      const lowPriorityWord = createTestWord({
        root_id: rootId(2),
        fsrs_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        fsrs_state: 1,
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
      const word = createTestWord({ root_id: rootId(1) });
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

  describe('partitionSessionChunk', () => {
    const nowMs = Date.now();

    // A never-practised word — the filler anything already in memory must beat.
    const fillerWord = (id: number): StudyWord =>
      createTestWord({
        root_id: id as StudyWord['root_id'],
        fsrs_due: new Date(nowMs).toISOString(),
        fsrs_stability: 10,
        fsrs_difficulty: 6.5,
        fsrs_lapses: 0,
      });

    test('returns the input unchanged, and an empty rest, when it fits the chunk', () => {
      const words = [fillerWord(1), fillerWord(2)];
      expect(partitionSessionChunk(words, 5, nowMs)).toEqual({ chunk: words, rest: [] });
      expect(partitionSessionChunk(words, 2, nowMs)).toEqual({ chunk: words, rest: [] });
      expect(partitionSessionChunk([], 5, nowMs)).toEqual({ chunk: [], rest: [] });
    });

    test('returns exactly chunkSize words when over, and the remainder as rest', () => {
      const words = Array.from({ length: 30 }, (_, i) => fillerWord(i + 1));
      const { chunk, rest } = partitionSessionChunk(words, 20, nowMs);
      expect(chunk).toHaveLength(20);
      expect(rest).toHaveLength(10);
    });

    // The session refills from `rest`, so nothing may be lost or duplicated
    // between the two halves — a word that fell out of both would never be
    // reviewed, and the session would never reach completion.
    test('chunk and rest together are exactly the input, with no overlap', () => {
      const words = Array.from({ length: 47 }, (_, i) => fillerWord(i + 1));
      const { chunk, rest } = partitionSessionChunk(words, 20, nowMs);
      const ids = [...chunk, ...rest].map(w => w.root_id).sort((a, b) => a - b);
      expect(ids).toEqual(words.map(w => w.root_id).sort((a, b) => a - b));
      expect(new Set(ids).size).toBe(words.length);
    });

    // Refilling partitions `rest` again, so it has to already be in priority
    // order or the second chunk would be an arbitrary slice.
    test('rest stays in priority order, so a refill can partition it again', () => {
      const words = Array.from({ length: 30 }, (_, i) =>
        createTestWord({
          root_id: (i + 1) as StudyWord['root_id'],
          fsrs_due: new Date(nowMs - i * 3600 * 1000).toISOString(),
          fsrs_stability: 10,
        }),
      );
      const { rest } = partitionSessionChunk(words, 10, nowMs);
      const second = partitionSessionChunk(rest, 10, nowMs);
      expect(second.chunk).toEqual(rest.slice(0, 10));
    });

    test('keeps the time-sensitive words: a relearning step and a due review beat new words', () => {
      const relearning = createTestWord({
        root_id: 100 as StudyWord['root_id'],
        fsrs_due: new Date(nowMs - 10 * 60 * 1000).toISOString(),
        fsrs_state: 3,
        fsrs_reps: 4,
      });
      const review = createTestWord({
        root_id: 200 as StudyWord['root_id'],
        fsrs_due: new Date(nowMs).toISOString(),
        fsrs_last_review: new Date(nowMs - 5 * 24 * 3600 * 1000).toISOString(),
        fsrs_stability: 5,
        fsrs_reps: 5,
        fsrs_state: 2,
      });
      const fillers = Array.from({ length: 10 }, (_, i) => fillerWord(i + 1));

      const { chunk } = partitionSessionChunk([...fillers, review, relearning], 5, nowMs);

      expect(chunk.slice(0, 2).map(w => w.root_id)).toEqual([100, 200]);
      expect(chunk).toHaveLength(5);
    });

    test('is deterministic for a fixed timestamp', () => {
      const words = Array.from({ length: 25 }, (_, i) =>
        createTestWord({
          root_id: (i + 1) as StudyWord['root_id'],
          fsrs_due: new Date(nowMs - i * 3600 * 1000).toISOString(),
          fsrs_stability: (i % 10) + 1,
        }),
      );
      const first = partitionSessionChunk(words, 10, nowMs).chunk.map(w => w.root_id);
      const second = partitionSessionChunk(words, 10, nowMs).chunk.map(w => w.root_id);
      expect(first).toEqual(second);
    });
  });
});
