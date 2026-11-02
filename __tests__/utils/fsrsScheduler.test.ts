/**
 * The per-word routing between FSRS-6 and FSRS-7, with the switch ON. The default,
 * off, is held by fsrsScheduler.switchOff.test.ts.
 *
 * There is no review log to rebuild a learned word's FSRS-7 memory from, so the two
 * models live side by side permanently. What has to hold: a learned word is never
 * moved or given an invented fast trace, a word starting from nothing is FSRS-7, and
 * the model written with a grade is the model that graded it.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { Rating, State, type Grade } from 'ts-fsrs';

import { createResetFSRSUpdate } from '@/utils/fsrsInitializers';
import {
  gradeWord,
  previewWordDueDates,
  wordHoldDays,
  wordRetrievability,
} from '@/utils/fsrsScheduler';
import { getMemoryHorizonDays } from '@/utils/memoryHorizon';
import { isMasteredWord } from '@/utils/wordClassification';

import { createTestWord } from '../helpers/fsrsTestHelpers';

jest.mock('@/constants/fsrs', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/constants/fsrs'),
  NEW_WORD_FSRS_MODEL: 'FSRS-7',
}));

const LAST_REVIEW = '2026-02-10T00:00:00.000Z';
const DUE = '2026-02-20T00:00:00.000Z';
const NOW = new Date('2026-03-01T00:00:00.000Z');
const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

const learned = (overrides: Parameters<typeof createTestWord>[0] = {}) =>
  createTestWord({
    fsrs_state: State.Review,
    fsrs_stability: 10,
    fsrs_difficulty: 5,
    fsrs_due: DUE,
    fsrs_last_review: LAST_REVIEW,
    fsrs_scheduled_days: 10,
    fsrs_learning_steps: 0,
    fsrs_reps: 3,
    fsrs_lapses: 0,
    ...overrides,
  });

const fsrs7Learned = (overrides: Parameters<typeof createTestWord>[0] = {}) =>
  learned({ fsrs_model: 'FSRS-7', fsrs_stability_fast: 8, ...overrides });

const newWord = (overrides: Parameters<typeof createTestWord>[0] = {}) =>
  createTestWord({
    ...createResetFSRSUpdate(new Date(DUE)),
    // As an existing row reads: the column default, whatever it was created with.
    fsrs_model: 'FSRS-6',
    ...overrides,
  });

describe('routing', () => {
  test('an existing row with null new columns stays on FSRS-6', () => {
    const update = gradeWord(
      learned({ fsrs_model: null, fsrs_stability_fast: null }),
      Rating.Good,
      NOW,
    );
    expect(update.fsrs_model).toBe('FSRS-6');
    expect(update.fsrs_stability_fast).toBeNull();
  });

  test('a row persisted by an older version, with the columns absent, stays on FSRS-6', () => {
    const update = gradeWord(learned(), Rating.Good, NOW);
    expect(update.fsrs_model).toBe('FSRS-6');
    expect(update.fsrs_stability_fast).toBeNull();
  });

  test.each([State.Learning, State.Review, State.Relearning])(
    'a learned FSRS-6 word in state %s is never moved to FSRS-7',
    state => {
      for (const grade of GRADES) {
        const update = gradeWord(learned({ fsrs_state: state }), grade, NOW);
        expect(update.fsrs_model).toBe('FSRS-6');
        expect(update.fsrs_stability_fast).toBeNull();
      }
    },
  );

  test.each([State.Learning, State.Review, State.Relearning])(
    'a learned FSRS-7 word in state %s stays on FSRS-7 with a real fast trace',
    state => {
      for (const grade of GRADES) {
        const update = gradeWord(fsrs7Learned({ fsrs_state: state }), grade, NOW);
        expect(update.fsrs_model).toBe('FSRS-7');
        expect(update.fsrs_stability_fast).toBeGreaterThan(0);
      }
    },
  );

  test('a new word goes to FSRS-7 whatever the column says', () => {
    for (const fsrs_model of ['FSRS-6', 'FSRS-7', null]) {
      for (const grade of GRADES) {
        const update = gradeWord(newWord({ fsrs_model }), grade, NOW);
        expect(update.fsrs_model).toBe('FSRS-7');
        expect(update.fsrs_stability_fast).toBeGreaterThan(0);
      }
    }
  });

  test('a new word ignores its placeholder memory', () => {
    const placeholder = gradeWord(newWord(), Rating.Good, NOW);
    const other = gradeWord(newWord({ fsrs_stability: 99, fsrs_difficulty: 9 }), Rating.Good, NOW);
    expect(other.fsrs_stability).toBe(placeholder.fsrs_stability);
    expect(other.fsrs_difficulty).toBe(placeholder.fsrs_difficulty);
  });

  test('a reset word returns to FSRS-7, with no leftover fast trace', () => {
    const reset = createResetFSRSUpdate(NOW);
    expect(reset.fsrs_model).toBe('FSRS-7');
    expect(reset.fsrs_stability_fast).toBeNull();
    expect(reset.fsrs_fast_reviewed_at).toBeNull();
    expect(reset.fsrs_state).toBe(State.New);
  });

  test('a learned word marked FSRS-7 without a fast trace gets none invented', () => {
    for (const fsrs_stability_fast of [null, 0]) {
      const update = gradeWord(fsrs7Learned({ fsrs_stability_fast }), Rating.Good, NOW);
      expect(update.fsrs_model).toBe('FSRS-6');
      expect(update.fsrs_stability_fast).toBeNull();
    }
  });

  test('the model carries through consecutive grades of the same word', () => {
    let word = newWord();
    let at = NOW;
    for (const grade of [Rating.Good, Rating.Good, Rating.Again, Rating.Good, Rating.Good]) {
      const update = gradeWord(word, grade, at);
      expect(update.fsrs_model).toBe('FSRS-7');
      word = { ...word, ...update };
      at = new Date(Math.max(at.getTime(), new Date(update.fsrs_due).getTime()));
    }
    expect(word.fsrs_reps).toBe(5);
    expect(word.fsrs_lapses).toBe(1);
  });
});

describe('what a grade writes', () => {
  test('each grade of a new word leaves a different memory', () => {
    const memories = GRADES.map(grade => gradeWord(newWord(), grade, NOW).fsrs_stability);
    expect(new Set(memories).size).toBe(GRADES.length);
  });

  test('FSRS-6 keeps whole scheduled days; FSRS-7 may not', () => {
    expect(Number.isInteger(gradeWord(learned(), Rating.Good, NOW).fsrs_scheduled_days)).toBe(true);
    const shortStep = gradeWord(newWord(), Rating.Good, NOW);
    expect(shortStep.fsrs_scheduled_days).toBeGreaterThan(0);
    expect(shortStep.fsrs_scheduled_days).toBeLessThan(1);
  });

  test('stays inside the columns check constraints and the scheduling maximum', () => {
    for (const word of [learned(), fsrs7Learned(), newWord()]) {
      for (const grade of GRADES) {
        const update = gradeWord(word, grade, NOW);
        expect(update.fsrs_difficulty).toBeGreaterThanOrEqual(1);
        expect(update.fsrs_difficulty).toBeLessThanOrEqual(10);
        expect(update.fsrs_stability).toBeGreaterThanOrEqual(0);
        expect([0, 1, 2, 3]).toContain(update.fsrs_state);
        const days = (new Date(update.fsrs_due).getTime() - NOW.getTime()) / 86_400_000;
        expect(days).toBeLessThanOrEqual(365);
      }
    }
  });

  test('an FSRS-7 grade stamps which review its fast trace belongs to, an FSRS-6 grade none', () => {
    for (const word of [newWord(), fsrs7Learned()]) {
      const update = gradeWord(word, Rating.Good, NOW);
      expect(update.fsrs_fast_reviewed_at).toBe(update.fsrs_last_review);
    }
    expect(gradeWord(learned(), Rating.Good, NOW).fsrs_fast_reviewed_at).toBeNull();
  });

  test('the stamp moves on a review even when the fast trace does not', () => {
    // Why the database guards on the stamp: this review leaves the fast trace equal.
    const at = new Date('2026-03-01T00:01:00.000Z');
    const saturated = fsrs7Learned({
      fsrs_stability_fast: 36_500,
      fsrs_stability: 300,
      fsrs_fast_reviewed_at: LAST_REVIEW,
    });
    const update = gradeWord(saturated, Rating.Easy, at);
    expect(update.fsrs_stability_fast).toBe(36_500);
    expect(update.fsrs_stability).not.toBe(300);
    expect(update.fsrs_fast_reviewed_at).toBe(at.toISOString());
  });

  test('stamps the last review with the grading instant', () => {
    expect(gradeWord(learned(), Rating.Good, NOW).fsrs_last_review).toBe(NOW.toISOString());
    expect(gradeWord(newWord(), Rating.Good, NOW).fsrs_last_review).toBe(NOW.toISOString());
  });

  test('rejects an impossible state rather than scheduling from it', () => {
    expect(() => gradeWord(learned({ fsrs_stability: 0 }), Rating.Good, NOW)).toThrow();
    expect(() => gradeWord(learned(), Rating.Good, new Date('2026-02-01T00:00:00.000Z'))).toThrow();
  });
});

describe('preview', () => {
  test.each([
    ['new', newWord()],
    ['FSRS-6 learning', learned({ fsrs_state: State.Learning })],
    ['FSRS-6 review', learned()],
    ['FSRS-6 relearning', learned({ fsrs_state: State.Relearning })],
    ['FSRS-7 learning', fsrs7Learned({ fsrs_state: State.Learning })],
    ['FSRS-7 review', fsrs7Learned()],
    ['FSRS-7 relearning', fsrs7Learned({ fsrs_state: State.Relearning })],
  ])('matches what grading commits, fuzz included: %s', (_name, word) => {
    const dues = previewWordDueDates(word, NOW);
    for (const grade of GRADES) {
      expect(dues[grade].toISOString()).toBe(gradeWord(word, grade, NOW).fsrs_due);
    }
  });
});

describe('read-only derivations use the word’s own model', () => {
  test('FSRS-6 holds for its stability, exactly as before', () => {
    expect(wordHoldDays(learned({ fsrs_stability: 23.5 }))).toBe(23.5);
    expect(getMemoryHorizonDays(learned({ fsrs_stability: 23.5 }))).toBe(23.5);
  });

  test('FSRS-7 holds until recall reaches the target, not for its slow trace', () => {
    const word = fsrs7Learned({ fsrs_stability: 6, fsrs_stability_fast: 32 });
    const days = wordHoldDays(word);
    expect(days).not.toBeCloseTo(6, 1);
    expect(wordRetrievability(word, days)).toBeCloseTo(0.9, 3);
  });

  test('an FSRS-7 horizon never exceeds the scheduling maximum', () => {
    const word = fsrs7Learned({ fsrs_stability: 400, fsrs_stability_fast: 5000 });
    expect(wordHoldDays(word)).toBeLessThanOrEqual(365);
  });

  test('the same stored numbers read differently per model', () => {
    const six = learned({ fsrs_stability: 16 });
    const seven = fsrs7Learned({ fsrs_stability: 16, fsrs_stability_fast: 300 });
    expect(wordRetrievability(six, 16)).toBeCloseTo(0.9, 6);
    expect(wordRetrievability(seven, 16)).not.toBeCloseTo(0.9, 2);
  });

  test('mastery asks how long the word holds, not how large the slow trace is', () => {
    const holds = fsrs7Learned({
      fsrs_stability: 4,
      fsrs_stability_fast: 32,
      fsrs_difficulty: 3.5,
    });
    expect(wordHoldDays(holds)).toBeGreaterThanOrEqual(5);
    expect(isMasteredWord(holds)).toBe(true);

    // Just relearned: a slow trace above the bar, on a memory that holds about a day.
    const fragile = fsrs7Learned({
      fsrs_stability: 5.419,
      fsrs_stability_fast: 17.382,
      fsrs_difficulty: 9.02,
    });
    expect(wordHoldDays(fragile)).toBeLessThan(5);
    expect(isMasteredWord(fragile)).toBe(false);

    expect(isMasteredWord(learned({ fsrs_stability: 4 }))).toBe(false);
    expect(isMasteredWord(learned({ fsrs_stability: 5 }))).toBe(true);
  });

  test('a never-practised word still has no horizon', () => {
    expect(getMemoryHorizonDays(newWord())).toBeNull();
  });
});
