import type { StudyWord } from '@/types/vocabulary.types';
import { calculateDueWords, calculateStrugglingWords } from '@/utils/wordClassification';

export interface MemoryCapacityMetrics {
  capacityScore: number;
  trend: 'improving' | 'stable';
}

export interface WordStates {
  dueWords: number;
  strugglingWords: number;
}

/**
 * Calculate memory capacity metrics from study words
 * This is the core logic extracted from useMemoryCapacityGauge hook
 */
export function calculateMemoryCapacityMetrics(studyWords: StudyWord[]): MemoryCapacityMetrics {
  if (!studyWords.length) {
    return { capacityScore: 85, trend: 'stable' };
  }

  const validWords = studyWords.filter(w => w.fsrs_stability != null && w.fsrs_difficulty != null);
  if (!validWords.length) {
    return { capacityScore: 85, trend: 'stable' };
  }

  const { stabilitySum, difficultySum, repsSum } = validWords.reduce(
    (acc, word) => {
      acc.stabilitySum += word.fsrs_stability ?? 0;
      acc.difficultySum += word.fsrs_difficulty ?? 5;
      acc.repsSum += word.fsrs_reps ?? 0;
      return acc;
    },
    { stabilitySum: 0, difficultySum: 0, repsSum: 0 }
  );

  const averageStability = stabilitySum / validWords.length;
  const averageDifficulty = difficultySum / validWords.length;
  const averageReps = repsSum / validWords.length;

  const stabilityFactor = Math.min(averageStability / 30, 1) * 45;
  const repsFactor = Math.min(averageReps / 10, 1) * 30;
  const difficultyFactor = Math.max(0, (10 - averageDifficulty) / 10) * 25;

  const capacityScore = Math.round(stabilityFactor + repsFactor + difficultyFactor);

  // Trend calculation aligned with 3-phase system using the SAME definitions
  // used by UI gating (buttons) to keep behavior consistent across the app
  const wordStates = calculateWordStates(studyWords);
  const hasUrgentWords = wordStates.dueWords > 0 || wordStates.strugglingWords > 0;

  const trend = !hasUrgentWords && averageReps > 2 ? 'improving' : 'stable';

  return {
    capacityScore: Math.max(15, Math.min(100, capacityScore)),
    trend,
  };
}

/**
 * Calculate word states for proper phase determination
 */
export function calculateWordStates(studyWords: StudyWord[]): WordStates {
  // IMPORTANT: Reuse the exact same calculations as VocabularyStatCards
  // so the gauge color/phase matches button availability and counts
  const dueWords = calculateDueWords(studyWords);
  const strugglingWords = calculateStrugglingWords(studyWords);

  return { dueWords, strugglingWords };
}
