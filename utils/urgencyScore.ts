/**
 * Utility functions for displaying vocabulary word memory strength and
 * difficulty. Used for progress bars and visual indicators in the dictionary.
 */

import { UNSTABLE_DIFFICULTY_THRESHOLD } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { hasBeenPractised } from '@/utils/wordClassification';

/** Above this, FSRS difficulty reads as "moderate" rather than "easy" */
const MODERATE_DIFFICULTY_THRESHOLD = 5;

/*
 * `getStabilityProgressColor` used to live here: stability < 3 → Weak, < 7 →
 * Medium, else Strong. It was deleted with the word screen's "Strength" row.
 * Three buckets over a value that runs to 365 days meant the label stopped
 * moving about a week into a word's life — exactly when its memory starts
 * developing — and its ">= 7 is Strong" bar had silently drifted away from the
 * app's actual mastery rule (state 2 + stability >= 5). Both jobs now belong to
 * utils/memoryHorizon.ts, which reports the horizon as a real quantity.
 */

/**
 * How hard FSRS thinks a word intrinsically is. `null` means the word has never
 * been reviewed, so there is no difficulty signal yet — distinct from "easy".
 *
 * Single source of truth for both the dictionary row's dot and the word detail
 * screen's Difficulty stat, so the two can never disagree.
 *
 * @param difficulty - FSRS difficulty value (1-10)
 */
export function getDifficultyLevel(
  difficulty: number | null | undefined,
): 'new' | 'easy' | 'moderate' | 'hard' {
  if (difficulty == null) return 'new';
  if (difficulty >= UNSTABLE_DIFFICULTY_THRESHOLD) return 'hard';
  if (difficulty >= MODERATE_DIFFICULTY_THRESHOLD) return 'moderate';
  return 'easy';
}

/**
 * The difficulty level to *show* for a study word.
 *
 * `getDifficultyLevel(null)` returns 'new', but that branch never fired in
 * production: a never-practised word carries a placeholder difficulty of 6.5,
 * not null, so the dictionary painted it amber and called it "Moderate" — a
 * judgement about a word the learner has never been asked. Gate on real reviews
 * first, exactly as the memory meter beside it does, so the two signals agree
 * about which words haven't started.
 */
export function getWordDifficultyLevel(word: StudyWord): ReturnType<typeof getDifficultyLevel> {
  return hasBeenPractised(word) ? getDifficultyLevel(word.fsrs_difficulty) : 'new';
}

export const DIFFICULTY_LABELS = {
  new: STRINGS.WORD_STATE_NEW,
  easy: STRINGS.WORD_DIFFICULTY_EASY,
  moderate: STRINGS.WORD_DIFFICULTY_MODERATE,
  hard: STRINGS.WORD_DIFFICULTY_HARD,
} as const satisfies Record<ReturnType<typeof getDifficultyLevel>, string>;

/**
 * Theme color key for a difficulty level. Red reads as "needs your attention",
 * matching the strength scale's polarity, so one glance means the same thing
 * whichever signal a surface shows. `new` gets a neutral dot rather than no dot
 * so the leading indicator column stays aligned.
 */
export const DIFFICULTY_COLORS = {
  new: 'textTertiary',
  easy: 'success',
  moderate: 'warning',
  hard: 'error',
} as const satisfies Record<ReturnType<typeof getDifficultyLevel>, string>;
