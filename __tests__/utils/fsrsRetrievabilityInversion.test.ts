/**
 * wordDaysUntilRetrievability — the inverse of each model's forgetting curve.
 *
 * The round-trip property is the load-bearing test: if a ts-fsrs upgrade changes a
 * curve, the inversion and the library must still agree, or this suite fails loudly.
 */

import { describe, expect, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import { wordDaysUntilRetrievability, wordRetrievability } from '../../utils/fsrsScheduler';
import { createTestWord } from '../helpers/fsrsTestHelpers';

const fsrs6Word = (stability: number) =>
  createTestWord({ fsrs_stability: stability, fsrs_difficulty: 5, fsrs_state: State.Review });

const fsrs7Word = (stability: number, fast: number) =>
  createTestWord({
    fsrs_stability: stability,
    fsrs_stability_fast: fast,
    fsrs_model: 'FSRS-7',
    fsrs_difficulty: 5,
    fsrs_state: State.Review,
  });

const THRESHOLDS = [0.95, 0.9, 0.7, 0.5];

describe('wordDaysUntilRetrievability', () => {
  test('round-trips through the FSRS-6 forgetting curve', () => {
    for (const stability of [0.5, 1, 7, 30, 180]) {
      for (const threshold of THRESHOLDS) {
        const word = fsrs6Word(stability);
        const days = wordDaysUntilRetrievability(word, threshold);
        expect(days).not.toBeNull();
        expect(wordRetrievability(word, days as number)).toBeCloseTo(threshold, 4);
      }
    }
  });

  test('round-trips through the FSRS-7 forgetting curve', () => {
    for (const [stability, fast] of [
      [4, 3],
      [6, 32],
      [3.5, 20],
      [10, 2],
    ] as const) {
      for (const threshold of THRESHOLDS) {
        const word = fsrs7Word(stability, fast);
        const days = wordDaysUntilRetrievability(word, threshold);
        expect(days).not.toBeNull();
        expect(wordRetrievability(word, days as number)).toBeCloseTo(threshold, 4);
      }
    }
  });

  test('FSRS-7: the library caps the inversion, so a capped answer errs towards more recall', () => {
    const word = fsrs7Word(16, 300);
    const days = wordDaysUntilRetrievability(word, 0.5) as number;
    expect(days).toBeCloseTo(36_500, 4);
    expect(wordRetrievability(word, days)).toBeGreaterThan(0.5);
  });

  test('FSRS-6: R = 0.9 at t = S by definition of stability', () => {
    expect(wordDaysUntilRetrievability(fsrs6Word(10), 0.9)).toBeCloseTo(10, 4);
  });

  test('FSRS-7: stability is not the 90% point, which is why nothing reads it as days', () => {
    const word = fsrs7Word(16, 300);
    expect(wordRetrievability(word, 16)).not.toBeCloseTo(0.9, 2);
    expect(wordDaysUntilRetrievability(word, 0.9)).not.toBeCloseTo(16, 1);
  });

  test('time to threshold grows as the threshold drops, under both models', () => {
    for (const word of [fsrs6Word(10), fsrs7Word(10, 8)]) {
      const toCritical = wordDaysUntilRetrievability(word, 0.7) as number;
      const toUrgent = wordDaysUntilRetrievability(word, 0.5) as number;
      expect(toUrgent).toBeGreaterThan(toCritical);
    }
  });

  test('FSRS-6 is not rounded to whole days and scales linearly with stability', () => {
    const t1 = wordDaysUntilRetrievability(fsrs6Word(1), 0.7) as number;
    const t30 = wordDaysUntilRetrievability(fsrs6Word(30), 0.7) as number;
    expect(Number.isInteger(t1)).toBe(false);
    expect(t30 / t1).toBeCloseTo(30, 6);
  });

  test('returns null for meaningless inputs', () => {
    expect(wordDaysUntilRetrievability(fsrs6Word(0), 0.7)).toBeNull();
    expect(wordDaysUntilRetrievability(fsrs6Word(-1), 0.7)).toBeNull();
    expect(wordDaysUntilRetrievability(fsrs6Word(10), 0)).toBeNull();
    expect(wordDaysUntilRetrievability(fsrs6Word(10), 1)).toBeNull();
    expect(wordDaysUntilRetrievability(fsrs6Word(10), 1.2)).toBeNull();
  });
});
