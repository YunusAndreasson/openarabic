import type { StudyWord } from '@/types/vocabulary.types';

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

  const isHighDifficultyWithLapses = difficulty >= 8.0 && lapses > 0; // Hard difficulty with lapses
  const isStrugglingInLearning = (state === 1 || state === 2) && lapses > 1;
  const isUnstableAndDifficult = stability < 7 && difficulty >= 7.0 && lapses > 0; // Above medium difficulty

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
