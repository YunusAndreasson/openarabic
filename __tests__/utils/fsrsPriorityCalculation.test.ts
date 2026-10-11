import { describe, expect, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import { calculateWordPriority } from '../../utils/fsrsSpacing';
import { PriorityQueue } from '../../utils/priorityQueue';
import { createTestWord } from '../helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import type { StudyWord } from '@/types/vocabulary.types';

const NOW_MS = new Date('2024-01-01T00:00:00Z').getTime();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const ago = (ms: number) => new Date(NOW_MS - ms).toISOString();

const newWord = (id: number, savedAgoMs: number) =>
  createTestWord({ root_id: rootId(id), fsrs_state: State.New, created_at: ago(savedAgoMs) });

const stepWord = (id: number, dueAgoMs: number, state: State = State.Learning) =>
  createTestWord({ root_id: rootId(id), fsrs_state: state, fsrs_reps: 1, fsrs_due: ago(dueAgoMs) });

/** A Review word last seen `sinceReviewMs` ago; retrievability falls as that grows. */
const reviewWord = (id: number, sinceReviewMs: number, overrides: Partial<StudyWord> = {}) =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: State.Review,
    fsrs_reps: 5,
    fsrs_stability: 5,
    fsrs_last_review: ago(sinceReviewMs),
    fsrs_due: ago(HOUR),
    ...overrides,
  });

const priority = (word: StudyWord) => calculateWordPriority(word, NOW_MS);

/** Root ids in the order the session would serve them. */
const servedOrder = (words: StudyWord[]) => {
  const queue = new PriorityQueue<StudyWord>();
  words.forEach(word => queue.push(word, priority(word)));
  const order: number[] = [];
  while (!queue.isEmpty()) order.push(queue.pop()!.root_id);
  return order;
};

describe('calculateWordPriority', () => {
  describe('bands', () => {
    test('serves learning steps, then reviews, then new words', () => {
      const words = [newWord(1, 30 * DAY), reviewWord(2, 6 * DAY), stepWord(3, 5 * 60 * 1000)];

      expect(servedOrder(words)).toEqual([3, 2, 1]);
    });

    test('a relearning step is as time-critical as a learning step', () => {
      expect(priority(stepWord(1, HOUR, State.Relearning))).toBe(priority(stepWord(2, HOUR)));
    });

    // The case the old formula got backwards: it counted hours since the save
    // as "overdue", so a word saved a month ago and never practised outranked
    // every review that was actually decaying.
    test('a new word saved a month ago waits behind a review due an hour ago', () => {
      expect(priority(reviewWord(1, 5 * DAY))).toBeLessThan(priority(newWord(2, 30 * DAY)));
    });

    test('no band overlaps another, however extreme the word', () => {
      const lastStep = priority(stepWord(1, -365 * DAY));
      const firstReview = priority(reviewWord(2, 50 * 365 * DAY));
      const lastReview = priority(reviewWord(3, 0));
      const firstNew = priority(newWord(4, 50 * 365 * DAY));

      expect(lastStep).toBeLessThan(firstReview);
      expect(firstReview).toBeLessThan(lastReview);
      expect(lastReview).toBeLessThanOrEqual(firstNew);
    });
  });

  describe('within a band', () => {
    test('learning steps: longest due first', () => {
      expect(servedOrder([stepWord(1, HOUR), stepWord(2, 5 * HOUR), stepWord(3, -HOUR)])).toEqual([
        2, 1, 3,
      ]);
    });

    // What the reminders promise: the words nearest the forgetting point.
    test('reviews: lowest retrievability first', () => {
      const fresh = reviewWord(1, 2 * DAY);
      const fading = reviewWord(2, 10 * DAY);
      const nearlyGone = reviewWord(3, 60 * DAY);

      expect(servedOrder([fresh, nearlyGone, fading])).toEqual([3, 2, 1]);
    });

    test('reviews: equally overdue, the more fragile word is the more urgent', () => {
      const stable = reviewWord(1, 10 * DAY, { fsrs_stability: 30 });
      const fragile = reviewWord(2, 10 * DAY, { fsrs_stability: 3 });

      expect(priority(fragile)).toBeLessThan(priority(stable));
    });

    test('new words: longest saved first', () => {
      expect(servedOrder([newWord(1, HOUR), newWord(2, 9 * DAY), newWord(3, 2 * DAY)])).toEqual([
        2, 3, 1,
      ]);
    });
  });

  describe('what no longer moves a word', () => {
    test('lapses and difficulty', () => {
      const leech = reviewWord(1, 5 * DAY, { fsrs_lapses: 6, fsrs_difficulty: 9.5 });
      const easy = reviewWord(2, 5 * DAY, { fsrs_lapses: 0, fsrs_difficulty: 2 });

      expect(priority(leech)).toBe(priority(easy));
    });

    test("a review's due date, beyond what its retrievability already says", () => {
      expect(priority(reviewWord(1, 5 * DAY, { fsrs_due: ago(48 * HOUR) }))).toBe(
        priority(reviewWord(2, 5 * DAY, { fsrs_due: ago(HOUR) })),
      );
    });
  });

  describe('bad data', () => {
    test.each([
      ['a null due date', { fsrs_state: State.Learning, fsrs_due: null }],
      ['an unparseable due date', { fsrs_state: State.Learning, fsrs_due: 'not-a-date' }],
      ['a new word with no save date', { fsrs_state: State.New, created_at: 'not-a-date' }],
      ['a review with no stability', { fsrs_state: State.Review, fsrs_stability: null }],
      ['a null state', { fsrs_state: null }],
    ] as const)('%s still gets a finite priority', (_name, overrides) => {
      const word = createTestWord({ root_id: rootId(1), ...overrides } as Partial<StudyWord>);

      expect(Number.isFinite(priority(word))).toBe(true);
    });

    // Retrievability 0 is "FSRS cannot say", which sorts as most forgotten —
    // still inside the review band, never ahead of a learning step.
    test('a review with no usable stability stays inside the review band', () => {
      const unscored = priority(reviewWord(1, DAY, { fsrs_stability: null }));

      expect(unscored).toBeGreaterThan(priority(stepWord(2, -365 * DAY)));
      expect(unscored).toBeLessThan(priority(newWord(3, 50 * 365 * DAY)));
    });
  });
});
