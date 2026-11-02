/**
 * Tests for the memory-horizon module — the single source of truth behind the
 * dictionary row's meter and the word detail screen's Memory panel.
 *
 * The stage boundary is the one worth guarding: `mastered` must stay bolted to
 * `isMasteredWord` (state 2 + stability >= 5), the same predicate the Practice
 * screen's Mastered count uses. A second threshold drifting away from it is
 * exactly how the deleted `Strength: Strong` (stability >= 7) went wrong.
 */

import { describe, expect, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { OPTIMIZED_FSRS_CONFIG } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import {
  MEMORY_STAGE_LABELS,
  formatHorizon,
  getHorizonAccessibilityLabel,
  getHorizonFraction,
  getMemoryHorizonDays,
  getMemoryStage,
} from '@/utils/memoryHorizon';
import { hasBeenPractised } from '@/utils/wordClassification';

describe('getMemoryStage', () => {
  test('a never-studied word is new', () => {
    expect(getMemoryStage(createTestWord({ fsrs_state: State.New }))).toBe('new');
  });

  test('learning and relearning both read as learning', () => {
    expect(getMemoryStage(createTestWord({ fsrs_state: State.Learning }))).toBe('learning');
    expect(getMemoryStage(createTestWord({ fsrs_state: State.Relearning }))).toBe('learning');
  });

  test('a graduated word below the mastery bar is familiar', () => {
    const word = createTestWord({ fsrs_state: State.Review, fsrs_stability: 4.9 });
    expect(getMemoryStage(word)).toBe('familiar');
  });

  test('mastered starts exactly at the app-wide mastery threshold', () => {
    expect(getMemoryStage(createTestWord({ fsrs_state: State.Review, fsrs_stability: 5 }))).toBe(
      'mastered',
    );
    expect(
      getMemoryStage(createTestWord({ fsrs_state: State.Review, fsrs_stability: 4.999 })),
    ).toBe('familiar');
  });

  test('high stability in a non-Review state is never mastered', () => {
    // A relearning word can carry a large stability from before it lapsed.
    // Mastery is about having graduated, not about the number alone.
    const word = createTestWord({ fsrs_state: State.Relearning, fsrs_stability: 200 });
    expect(getMemoryStage(word)).toBe('learning');
  });

  test('a null state falls back to new rather than throwing', () => {
    expect(getMemoryStage(createTestWord({ fsrs_state: null }))).toBe('new');
  });

  test('every stage has a label', () => {
    expect(Object.values(MEMORY_STAGE_LABELS)).toEqual(expect.arrayOf(expect.stringMatching(/.+/)));
    expect(MEMORY_STAGE_LABELS.new).toBe(STRINGS.WORD_STATE_NEW);
  });
});

describe('hasBeenPractised', () => {
  test('a freshly saved word has not been practised, placeholders notwithstanding', () => {
    // These are the exact values createInitialFSRSEntry writes. fsrs_last_review
    // is NOT NULL and gets stamped at save time, so nothing here is a null check.
    const fresh = createTestWord({
      fsrs_state: State.New,
      fsrs_reps: 0,
      fsrs_stability: 0.4,
      fsrs_difficulty: 6.5,
      fsrs_last_review: new Date().toISOString(),
    });

    expect(hasBeenPractised(fresh)).toBe(false);
    expect(getMemoryHorizonDays(fresh)).toBeNull();
    expect(getHorizonFraction(getMemoryHorizonDays(fresh))).toBe(0);
  });

  test('one review is enough', () => {
    expect(hasBeenPractised(createTestWord({ fsrs_state: State.Learning, fsrs_reps: 1 }))).toBe(
      true,
    );
  });
});

describe('getMemoryHorizonDays', () => {
  const practised = (overrides: Parameters<typeof createTestWord>[0]) =>
    createTestWord({ fsrs_state: State.Review, fsrs_reps: 4, ...overrides });

  test('returns the stability when there is one', () => {
    expect(getMemoryHorizonDays(practised({ fsrs_stability: 23.4 }))).toBe(23.4);
  });

  test('null, zero and negative stability all mean "no horizon", not zero days', () => {
    // Null is a different statement from zero: the word has not started, rather
    // than being forgotten instantly.
    expect(getMemoryHorizonDays(practised({ fsrs_stability: null }))).toBeNull();
    expect(getMemoryHorizonDays(practised({ fsrs_stability: 0 }))).toBeNull();
    expect(getMemoryHorizonDays(practised({ fsrs_stability: -3 }))).toBeNull();
  });
});

describe('getHorizonFraction', () => {
  test('no horizon is an empty meter', () => {
    expect(getHorizonFraction(null)).toBe(0);
    expect(getHorizonFraction(0)).toBe(0);
  });

  test('is monotonically increasing', () => {
    const days = [0.5, 1, 3, 7, 30, 90, 200, 365];
    const fractions = days.map(getHorizonFraction);
    fractions.forEach((fraction, index) => {
      if (index === 0) return;
      expect(fraction).toBeGreaterThan(fractions[index - 1] as number);
    });
  });

  test('fills exactly at the scheduler maximum interval and clamps beyond it', () => {
    expect(getHorizonFraction(OPTIMIZED_FSRS_CONFIG.maximumInterval)).toBeCloseTo(1, 6);
    expect(getHorizonFraction(10_000)).toBe(1);
  });

  test('log scale gives the early days real width', () => {
    // The whole point of not being linear: a one-week word must be visibly more
    // than a rounding error on a scale that runs to a year. Linearly it would be
    // under 2%.
    expect(getHorizonFraction(7)).toBeGreaterThan(0.3);
    expect(getHorizonFraction(7)).toBeLessThan(0.4);
  });

  test('survives non-finite input', () => {
    expect(getHorizonFraction(Number.NaN)).toBe(0);
    expect(getHorizonFraction(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('formatHorizon', () => {
  test('picks the unit that keeps the number small', () => {
    expect(formatHorizon(1)).toBe('1 day');
    expect(formatHorizon(3)).toBe('3 days');
    expect(formatHorizon(6.9)).toBe('7 days');
    expect(formatHorizon(7)).toBe('1 week');
    expect(formatHorizon(21)).toBe('3 weeks');
    expect(formatHorizon(30)).toBe('1 month');
    expect(formatHorizon(120)).toBe('4 months');
    expect(formatHorizon(365)).toBe('over a year');
    expect(formatHorizon(900)).toBe('over a year');
  });

  test('a sub-day horizon still reads as a day, never as zero', () => {
    // A learning-step card holds for hours. "0 days" would look like a bug.
    expect(formatHorizon(0.2)).toBe('1 day');
  });

  test('no horizon formats to nothing at all', () => {
    expect(formatHorizon(null)).toBe('');
    expect(formatHorizon(0)).toBe('');
  });
});

describe('getHorizonAccessibilityLabel', () => {
  test('spells out a meter that is otherwise length-only', () => {
    expect(getHorizonAccessibilityLabel(21)).toContain('3 weeks');
  });

  test('says the word has not been practised rather than "0"', () => {
    expect(getHorizonAccessibilityLabel(null)).toBe(STRINGS.WORD_HORIZON_A11Y_NONE);
  });
});
