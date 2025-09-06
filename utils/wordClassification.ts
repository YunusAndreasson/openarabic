import {
  DEFAULT_FSRS_DIFFICULTY,
  DEFAULT_SESSION_COOLDOWN_HOURS,
  STRUGGLING_DIFFICULTY_THRESHOLD,
  STRUGGLING_LAPSES_THRESHOLD,
  UNSTABLE_DIFFICULTY_THRESHOLD,
  UNSTABLE_STABILITY_THRESHOLD,
} from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * Determines if a word needs attention (is struggling/hard) based on FSRS metrics
 * This logic is used consistently across the app for:
 * - VocabularyStatCards "Struggling" count
 * - useWordList "needsAttention" category
 * - Session options modal struggling words count
 */
export function isStrugglingWord(word: StudyWord): boolean {
  const difficulty = word.fsrs_difficulty ?? DEFAULT_FSRS_DIFFICULTY; // Default to medium difficulty in 5-10 range
  const lapses = word.fsrs_lapses ?? 0;
  const stability = word.fsrs_stability ?? 0;
  const state = word.fsrs_state;

  const isHighDifficultyWithLapses =
    difficulty >= STRUGGLING_DIFFICULTY_THRESHOLD && lapses >= STRUGGLING_LAPSES_THRESHOLD;
  const isStrugglingInLearning =
    (state === 1 || state === 2) && lapses > STRUGGLING_LAPSES_THRESHOLD;
  const isUnstableAndDifficult =
    stability < UNSTABLE_STABILITY_THRESHOLD &&
    difficulty >= UNSTABLE_DIFFICULTY_THRESHOLD &&
    lapses >= STRUGGLING_LAPSES_THRESHOLD;

  return isHighDifficultyWithLapses || isStrugglingInLearning || isUnstableAndDifficult;
}

/**
 * Calculate due words from study words
 * Uses FSRS due date logic to determine which words are currently due for review
 */
export function calculateDueWords(studyWords: StudyWord[]): number {
  const nowMs = Date.now();
  const cutoffMs = nowMs - DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000;

  const normalizeTs = (ts: string | null) => {
    if (typeof ts === 'string') return ts.replace(' ', 'T');
    return undefined;
  };

  return studyWords.filter(word => {
    // New words (state 0) are always due for their first review
    if (word.fsrs_state === 0) {
      return true;
    }

    const dueStr = normalizeTs(word.fsrs_due);
    const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;
    const isDue = Number.isFinite(dueMs) && dueMs <= nowMs;

    // Apply the same session cooldown so indicators match session content
    const lastStr = normalizeTs(word.fsrs_last_review);
    const lastMs = lastStr ? Date.parse(lastStr) : 0;
    const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;

    return isDue && !isRecentlyReviewed;
  }).length;
}

/**
 * Calculate learning words using server-side logic (matching session logic)
 * Server: 'fsrs_state.in.(0,1,3),and(fsrs_state.eq.2,fsrs_stability.lt.5)'
 *
 * Note: State 0 (New) words are actually due for their first review, not learning.
 * Only words in states 1 (Learning), 3 (Relearning), or state 2 with low stability are learning.
 */
export function calculateLearningWords(studyWords: StudyWord[]): number {
  return studyWords.filter(word => {
    const state = word.fsrs_state;
    const stability = word.fsrs_stability ?? 0;
    // State 0 (New) words are due for first review, not learning
    // Only states 1, 3, or state 2 with low stability are learning
    return state === 1 || state === 3 || (state === 2 && stability < 5);
  }).length;
}

/**
 * Calculate mastered words using server-side logic (matching session logic)
 * Server: 'fsrs_state.eq.2,fsrs_stability.gte.5'
 */
export function calculateMasteredWords(studyWords: StudyWord[]): number {
  return studyWords.filter(word => {
    const state = word.fsrs_state;
    const stability = word.fsrs_stability ?? 0;
    return state === 2 && stability >= 5;
  }).length;
}

/**
 * Calculate struggling words that have been reviewed (matching session logic)
 * This ensures the display count matches what users will actually practice
 */
export function calculateStrugglingWords(studyWords: StudyWord[]): number {
  const nowMs = Date.now();
  const cutoffMs = nowMs - DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000;
  const normalizeTs = (ts: string | null) => {
    if (typeof ts === 'string') return ts.replace(' ', 'T');
    return undefined;
  };

  return studyWords.filter(word => {
    const hasBeenReviewed = (word.fsrs_reps ?? 0) > 0;
    if (!hasBeenReviewed) return false;

    // Apply the same cooldown as the session so indicators match session content
    const lastStr = normalizeTs(word.fsrs_last_review);
    const lastMs = lastStr ? Date.parse(lastStr) : 0;
    const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;
    if (isRecentlyReviewed) return false;

    return isStrugglingWord(word);
  }).length;
}

/**
 * Calculate all word categories in a single pass for efficiency
 * Returns an object with all category counts
 */
export function calculateWordCategories(
  studyWords: StudyWord[],
  dueWordsProp?: number
): {
  dueWords: number;
  learningWords: number;
  masteredWords: number;
  strugglingWords: number;
} {
  const calculatedDueWords = calculateDueWords(studyWords);
  const learningWords = calculateLearningWords(studyWords);
  const masteredWords = calculateMasteredWords(studyWords);
  const strugglingWords = calculateStrugglingWords(studyWords);

  return {
    // Prioritize the provided dueWords count (includes cooldown filtering) even when it's 0
    dueWords: typeof dueWordsProp === 'number' ? dueWordsProp : calculatedDueWords,
    learningWords,
    masteredWords,
    strugglingWords,
  };
}

/**
 * Determines if a word is in an unstable learning state
 * Used for prioritizing review schedules and identifying problematic words
 */
export function isUnstableWord(word: StudyWord): boolean {
  const difficulty = word.fsrs_difficulty ?? DEFAULT_FSRS_DIFFICULTY;
  const stability = word.fsrs_stability ?? 0;

  return stability <= UNSTABLE_STABILITY_THRESHOLD && difficulty >= UNSTABLE_DIFFICULTY_THRESHOLD;
}

/**
 * Calculate the count of struggling words from a list of study words
 */
export const getStrugglingWordsCount = (studyWords: StudyWord[]): number => {
  if (!Array.isArray(studyWords) || studyWords.length === 0) {
    return 0;
  }

  const nowMs = Date.now();
  const cutoffMs = nowMs - DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000;
  const normalizeTs = (ts: string | null) => {
    if (typeof ts === 'string') return ts.replace(' ', 'T');
    return undefined;
  };

  return studyWords.filter(word => {
    if (!word || word.root_id == null) return false;
    const hasBeenReviewed = (word.fsrs_reps ?? 0) > 0;
    if (!hasBeenReviewed) return false;
    const lastStr = normalizeTs(word.fsrs_last_review);
    const lastMs = lastStr ? Date.parse(lastStr) : 0;
    const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;
    if (isRecentlyReviewed) return false;
    return isStrugglingWord(word);
  }).length;
};
