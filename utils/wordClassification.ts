import type { StudyWord } from '@/types/vocabulary.types';
import {
  STRUGGLING_DIFFICULTY_THRESHOLD,
  STRUGGLING_LAPSES_THRESHOLD,
  UNSTABLE_STABILITY_THRESHOLD,
  UNSTABLE_DIFFICULTY_THRESHOLD,
} from '@/constants/fsrs';

/**
 * Determines if a word needs attention (is struggling/hard) based on FSRS metrics
 * This logic is used consistently across the app for:
 * - VocabularyStatCards "Struggling" count
 * - useWordList "needsAttention" category
 * - Session options modal struggling words count
 */
export function isStrugglingWord(word: StudyWord): boolean {
  const difficulty = word.fsrs_difficulty ?? 6.5; // Default to medium difficulty in 5-10 range
  const lapses = word.fsrs_lapses ?? 0;
  const stability = word.fsrs_stability ?? 0;
  const state = word.fsrs_state;

  const isHighDifficultyWithLapses =
    difficulty >= STRUGGLING_DIFFICULTY_THRESHOLD &&
    lapses >= STRUGGLING_LAPSES_THRESHOLD;
  const isStrugglingInLearning =
    (state === 1 || state === 2) && lapses > STRUGGLING_LAPSES_THRESHOLD;
  const isUnstableAndDifficult =
    stability < UNSTABLE_STABILITY_THRESHOLD &&
    difficulty >= UNSTABLE_DIFFICULTY_THRESHOLD &&
    lapses >= STRUGGLING_LAPSES_THRESHOLD;

  return isHighDifficultyWithLapses || isStrugglingInLearning || isUnstableAndDifficult;
}

/**
 * Calculate the count of struggling words from a list of study words
 */
export const getStrugglingWordsCount = (studyWords: StudyWord[]): number => {
  if (!Array.isArray(studyWords) || studyWords.length === 0) {
    return 0;
  }

  return studyWords.filter(word => word != null && word.root_id != null && isStrugglingWord(word))
    .length;
};
