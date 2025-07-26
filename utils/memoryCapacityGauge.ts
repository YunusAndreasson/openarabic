import type { StudyWord } from '@/types/vocabulary.types';
import { isStrugglingWord } from '@/utils/wordClassification';

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

  // Trend calculation aligned with 3-phase system
  // Only show "improving" in green phase when memory is actually in good state
  const hasUrgentWords = studyWords.some(word => {
    const now = new Date();
    const dueDate = word.fsrs_due ? new Date(word.fsrs_due) : new Date('9999-12-31');
    const isDue = dueDate <= now;
    const hasBeenReviewed = word.fsrs_last_review != null && (word.fsrs_reps ?? 0) > 0;
    const isStruggling = hasBeenReviewed && isStrugglingWord(word);
    return isDue || isStruggling;
  });

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
  const now = new Date();

  const dueWords = studyWords.filter(word => {
    const dueDate = word.fsrs_due ? new Date(word.fsrs_due) : new Date('9999-12-31');
    return dueDate <= now;
  }).length;

  const strugglingWords = studyWords.filter(word => {
    const hasBeenReviewed = word.fsrs_last_review != null && (word.fsrs_reps ?? 0) > 0;
    return hasBeenReviewed && isStrugglingWord(word);
  }).length;

  return { dueWords, strugglingWords };
}
