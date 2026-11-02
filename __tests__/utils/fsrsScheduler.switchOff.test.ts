/**
 * The switch OFF, which is the default: the release must behave as FSRS-6 for every
 * word, because an older installed app cannot read an FSRS-7 memory. No word may become
 * FSRS-7, and the memory must be the one ts-fsrs 5 produced.
 */

import { describe, expect, test } from '@jest/globals';
import { Rating, State, type Grade } from 'ts-fsrs';

import { NEW_WORD_FSRS_MODEL } from '@/constants/fsrs';
import { createBulkFSRSEntries, createResetFSRSUpdate } from '@/utils/fsrsInitializers';
import { gradeWord, previewWordDueDates, wordHoldDays } from '@/utils/fsrsScheduler';

import { createTestWord } from '../helpers/fsrsTestHelpers';

const DUE = '2026-02-20T00:00:00.000Z';
const NOW = new Date('2026-03-01T00:00:00.000Z');
const THREE_DAYS_AGO = '2026-02-26T00:00:00.000Z';
const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
const STATES = [State.Learning, State.Review, State.Relearning];

const newWord = () => createTestWord({ ...createResetFSRSUpdate(new Date(DUE)) });

const learned = (state: State) =>
  createTestWord({
    fsrs_state: state,
    fsrs_stability: 10,
    fsrs_difficulty: 5,
    fsrs_due: NOW.toISOString(),
    fsrs_last_review: THREE_DAYS_AGO,
    fsrs_scheduled_days: 3,
    fsrs_learning_steps: 0,
    fsrs_reps: 3,
    fsrs_lapses: 0,
  });

describe('with the switch at its default', () => {
  test('the default is FSRS-6', () => {
    expect(NEW_WORD_FSRS_MODEL).toBe('FSRS-6');
  });

  test('a new or reset word is written as FSRS-6, with no FSRS-7 state', () => {
    for (const row of [createResetFSRSUpdate(NOW), ...createBulkFSRSEntries('u', [1, 2])]) {
      expect(row.fsrs_model).toBe('FSRS-6');
      expect(row.fsrs_stability_fast).toBeNull();
      expect(row.fsrs_fast_reviewed_at).toBeNull();
    }
  });

  test('no grade of any word in any state becomes FSRS-7', () => {
    for (const word of [newWord(), ...STATES.map(learned)]) {
      for (const grade of GRADES) {
        const update = gradeWord(word, grade, NOW);
        expect(update.fsrs_model).toBe('FSRS-6');
        expect(update.fsrs_stability_fast).toBeNull();
        expect(update.fsrs_fast_reviewed_at).toBeNull();
      }
    }
  });

  test('a word never leaves FSRS-6 across consecutive grades', () => {
    let word = newWord();
    let at = NOW;
    for (const grade of [Rating.Good, Rating.Good, Rating.Again, Rating.Good, Rating.Easy]) {
      const update = gradeWord(word, grade, at);
      expect(update.fsrs_model).toBe('FSRS-6');
      word = { ...word, ...update };
      at = new Date(Math.max(at.getTime(), new Date(update.fsrs_due).getTime()));
    }
  });

  // ts-fsrs 5's output for the same input, measured with this app's config.
  test.each([
    [Rating.Again, 0.212],
    [Rating.Hard, 1.2931],
    [Rating.Good, 2.3065],
  ])('a new word graded %s leaves the ts-fsrs 5 memory', (grade, stability) => {
    expect(gradeWord(newWord(), grade as Grade, NOW).fsrs_stability).toBeCloseTo(stability, 3);
  });

  test.each([
    [Rating.Again, 1.26],
    [Rating.Hard, 15.04],
    [Rating.Good, 18.38],
    [Rating.Easy, 25.69],
  ])('a reviewed word graded %s leaves the ts-fsrs 5 memory', (grade, stability) => {
    const update = gradeWord(learned(State.Review), grade as Grade, NOW);
    expect(update.fsrs_stability).toBeCloseTo(stability, 2);
  });

  test('the horizon is still the stability', () => {
    expect(wordHoldDays(learned(State.Review))).toBe(10);
  });

  test('preview matches what grading commits', () => {
    for (const word of [newWord(), ...STATES.map(learned)]) {
      const dues = previewWordDueDates(word, NOW);
      for (const grade of GRADES) {
        expect(dues[grade].toISOString()).toBe(gradeWord(word, grade, NOW).fsrs_due);
      }
    }
  });

  test('a word already holding an FSRS-7 memory keeps it, since FSRS-6 cannot read it', () => {
    const word = createTestWord({
      ...learned(State.Review),
      fsrs_model: 'FSRS-7',
      fsrs_stability_fast: 8,
    });
    expect(gradeWord(word, Rating.Good, NOW).fsrs_model).toBe('FSRS-7');
  });
});
