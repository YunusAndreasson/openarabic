/**
 * Difficulty banding — the shared source of the dictionary row's dot and the
 * word detail screen's Difficulty stat, so the two surfaces cannot drift.
 *
 * This file used to test `getStabilityProgressColor` (the Weak/Medium/Strong
 * bands behind the word screen's deleted "Strength" row). That helper is gone;
 * memory strength is now a real horizon in days — see
 * `__tests__/utils/memoryHorizon.test.ts`. `getDifficultyLevel` had no coverage
 * at all until now.
 */

import { describe, expect, test } from '@jest/globals';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { UNSTABLE_DIFFICULTY_THRESHOLD } from '@/constants/fsrs';
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  getDifficultyLevel,
  getWordDifficultyLevel,
} from '@/utils/urgencyScore';
import { State } from 'ts-fsrs';

describe('getDifficultyLevel', () => {
  test('an unreviewed word is "new", which is not the same as "easy"', () => {
    expect(getDifficultyLevel(null)).toBe('new');
    expect(getDifficultyLevel(undefined)).toBe('new');
  });

  test('bands run easy → moderate → hard', () => {
    expect(getDifficultyLevel(1)).toBe('easy');
    expect(getDifficultyLevel(4.99)).toBe('easy');
    expect(getDifficultyLevel(5)).toBe('moderate');
    expect(getDifficultyLevel(7.49)).toBe('moderate');
    expect(getDifficultyLevel(UNSTABLE_DIFFICULTY_THRESHOLD)).toBe('hard');
    expect(getDifficultyLevel(10)).toBe('hard');
  });

  test('zero is a value, not a missing one', () => {
    // `?? 'new'` on a falsy check would mislabel this; only null/undefined mean
    // "never reviewed".
    expect(getDifficultyLevel(0)).toBe('easy');
  });

  test('every level has a label and a colour', () => {
    (['new', 'easy', 'moderate', 'hard'] as const).forEach(level => {
      expect(DIFFICULTY_LABELS[level]).toBeTruthy();
      expect(DIFFICULTY_COLORS[level]).toBeTruthy();
    });
  });

  test('red means "needs attention", so only hard gets the error colour', () => {
    expect(DIFFICULTY_COLORS.hard).toBe('error');
    expect(DIFFICULTY_COLORS.new).toBe('textTertiary');
  });
});

describe('getWordDifficultyLevel', () => {
  test('a never-practised word is "new", not the placeholder it was saved with', () => {
    // The regression this pins: `getDifficultyLevel(null) === 'new'` was
    // unreachable in production. A freshly saved word carries difficulty 6.5 —
    // never null — so the dictionary painted it amber and called it "Moderate",
    // a judgement about a word the learner has never been asked.
    const fresh = createTestWord({ fsrs_state: State.New, fsrs_reps: 0, fsrs_difficulty: 6.5 });

    expect(getDifficultyLevel(fresh.fsrs_difficulty)).toBe('moderate');
    expect(getWordDifficultyLevel(fresh)).toBe('new');
  });

  test('a practised word reports its measured difficulty', () => {
    const word = createTestWord({
      fsrs_state: State.Review,
      fsrs_reps: 6,
      fsrs_difficulty: 8.2,
    });

    expect(getWordDifficultyLevel(word)).toBe('hard');
  });

  test('resetting a word takes it back to "new"', () => {
    // createResetFSRSUpdate restores exactly the new-word placeholders.
    const reset = createTestWord({ fsrs_state: State.New, fsrs_reps: 0, fsrs_difficulty: 6.5 });

    expect(getWordDifficultyLevel(reset)).toBe('new');
  });
});
