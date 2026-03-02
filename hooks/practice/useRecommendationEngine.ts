import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { calculateNextDueDate } from '@/utils/fsrsUtils';
import { isHardWord } from '@/utils/wordClassification';

export interface RecommendationData {
  message: string;
  type: 'start' | 'review' | 'add_words' | 'consolidate' | 'balanced' | 'milestone';
}

interface RecommendationEngineParams {
  studyWords: StudyWord[];
  dueWordsCount: number;
  currentRetention: number;
  learningWords: number;
  masteredWords: number;
  currentStreak?: number;
}

// Thresholds
const LOW_RETENTION_THRESHOLD = 50;
const HEAVY_LOAD_RATIO = 0.7;
const MODERATE_LOAD_RATIO = 0.5;
const SMALL_VOCABULARY_THRESHOLD = 50;
const MANY_DUE_THRESHOLD = 5;

// Milestone targets
const WORD_MILESTONES = [10, 25, 50, 100, 200, 300, 500];

/**
 * Count words that are hard (forgotten 2+ times) using shared isHardWord logic
 */
function countHardWords(studyWords: StudyWord[]): number {
  return studyWords.filter(isHardWord).length;
}

/**
 * Count words due within the next N days (excluding today's due)
 */
function countUpcomingDue(studyWords: StudyWord[], days: number): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  return studyWords.filter(w => {
    if (!w.fsrs_due) return false;
    const due = new Date(w.fsrs_due);
    // Due after today but within N days
    return due > today && due <= futureDate;
  }).length;
}

/**
 * Get the next milestone and how many words remaining
 */
function getNextMilestone(masteredWords: number): { target: number; remaining: number } | null {
  const nextTarget = WORD_MILESTONES.find(m => m > masteredWords);
  if (!nextTarget) return null;
  return { target: nextTarget, remaining: nextTarget - masteredWords };
}

/**
 * Check if user has reviewed any word today
 */
function hasReviewedToday(studyWords: StudyWord[]): boolean {
  const today = new Date();
  const todayStr = today.toDateString();
  return studyWords.some(w => {
    if (!w.fsrs_last_review) return false;
    return new Date(w.fsrs_last_review).toDateString() === todayStr;
  });
}

/**
 * Format next due date for display
 */
function formatNextDue(nextDue: Date | null): string {
  if (!nextDue) return 'soon';
  const days = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/**
 * Check for milestone achievements and return celebration message
 */
function getMilestoneMessage(masteredWords: number, currentStreak?: number): string | null {
  // Check word milestones (exact matches to avoid repeated messages)
  if (masteredWords === 10) {
    return "🎉 10 words mastered! You've built a foundation for long-term memory.";
  }
  if (masteredWords === 25) {
    return "🎉 25 words mastered! Building your first 25 takes real dedication—you've proven you can learn Arabic consistently.";
  }
  if (masteredWords === 50) {
    return '🎉 50 words mastered! A strong start. Reviewing at increasing intervals moves these words into long-term memory.';
  }
  if (masteredWords === 100) {
    return '🎉 100 words mastered! A vocabulary this size makes reading Arabic noticeably easier.';
  }
  if (masteredWords === 200) {
    return '🎉 200 words mastered! You now recognize many of the most frequent Arabic words. Reading becomes genuinely enjoyable.';
  }
  if (masteredWords === 300) {
    return "🎉 300 words mastered! You've reached intermediate vocabulary. Context clues now help you guess unfamiliar words.";
  }
  if (masteredWords === 500) {
    return '🎉 500 words mastered! A rich vocabulary that makes Arabic texts far more accessible.';
  }

  // Check streak milestones
  if (currentStreak === 7) {
    return '🔥 7-day streak! One week of consistency—keep building this daily habit.';
  }
  if (currentStreak === 30) {
    return '🔥 30-day streak! A full month. Your brain has adapted to expect daily Arabic practice—this is now becoming automatic.';
  }
  if (currentStreak === 60) {
    return "🔥 60-day streak! Two months of daily practice. At this point, skipping a day would feel wrong. That's habit formation at work.";
  }
  if (currentStreak === 100) {
    return '🔥 100-day streak! This level of consistency is truly exceptional. Arabic is now part of your daily life.';
  }
  if (currentStreak === 365) {
    return "🔥 365-day streak! A full year of daily practice. You've proven extraordinary dedication to learning Arabic.";
  }

  return null;
}

/**
 * Enriched recommendation engine with educational context and smart insights
 * Leverages FSRS data to provide actionable, educational, and encouraging messages
 */
export function useRecommendationEngine({
  studyWords = [],
  dueWordsCount = 0,
  currentRetention = 0,
  learningWords = 0,
  masteredWords = 0,
  currentStreak,
}: RecommendationEngineParams): RecommendationData {
  return useMemo(() => {
    const totalWords = studyWords.length;
    const nextDue = calculateNextDueDate(studyWords);
    const nextDueText = formatNextDue(nextDue);
    const isLowRetention = currentRetention < LOW_RETENTION_THRESHOLD;
    const memoryStrength = Math.round(currentRetention);
    const hasManyDue = dueWordsCount >= MANY_DUE_THRESHOLD;

    // Smart insights calculations
    const hardWordsCount = countHardWords(studyWords);
    const tomorrowDue = countUpcomingDue(studyWords, 1);
    const milestone = getNextMilestone(masteredWords);
    const reviewedToday = hasReviewedToday(studyWords);

    // Calculate learning load ratio for granular consolidation messages
    const learningRatio = totalWords > 0 ? learningWords / totalWords : 0;
    const isHeavyLoad = learningRatio > HEAVY_LOAD_RATIO;
    const isModerateLoad = learningRatio > MODERATE_LOAD_RATIO && learningRatio <= HEAVY_LOAD_RATIO;

    // Priority 0: Check for milestone celebrations (only when no due words)
    if (dueWordsCount === 0) {
      const milestoneMessage = getMilestoneMessage(masteredWords, currentStreak);
      if (milestoneMessage) {
        return {
          message: milestoneMessage,
          type: 'milestone',
        };
      }
    }

    // State 1: No words - getting started
    if (totalWords === 0) {
      return {
        message:
          'Start by adding 10-15 words from articles. Small batches work best for long-term memory.',
        type: 'start',
      };
    }

    // State 2: Due words + low memory strength - urgent
    if (dueWordsCount > 0 && isLowRetention) {
      const hardWordsContext =
        hardWordsCount >= 3 ? ` ${hardWordsCount} difficult words need extra attention.` : '';
      return {
        message: `Memory Strength at ${memoryStrength}% — words at risk of being forgotten. Review now to rebuild.${hardWordsContext}`,
        type: 'review',
      };
    }

    // State 3: Due words (normal) - review with upcoming load preview
    if (dueWordsCount > 0) {
      const upcomingContext = tomorrowDue > 0 ? ` ${tomorrowDue} more tomorrow.` : '';

      if (hasManyDue) {
        return {
          message: `${dueWordsCount} words due at ${memoryStrength}% Memory Strength — review now to stay ahead of the forgetting curve.${upcomingContext}`,
          type: 'review',
        };
      }
      return {
        message: `Just ${dueWordsCount} word${dueWordsCount === 1 ? '' : 's'} due. Quick review keeps your ${memoryStrength}% Memory Strength strong.${upcomingContext}`,
        type: 'review',
      };
    }

    // State 4a: Heavy learning load (>70%) - brain at capacity
    if (isHeavyLoad) {
      return {
        message: `${learningWords} words in active learning — focus on reviews before adding more. Next batch due ${nextDueText}.`,
        type: 'consolidate',
      };
    }

    // State 4b: Moderate learning load (50-70%) - balanced guidance
    if (isModerateLoad) {
      const milestoneHint =
        milestone && milestone.remaining <= 5
          ? ` Just ${milestone.remaining} away from ${milestone.target} mastered!`
          : '';
      return {
        message: `${learningWords} words growing stronger. You can add a few more, but prioritize reviews when due.${milestoneHint}`,
        type: 'consolidate',
      };
    }

    // State 5: Small vocabulary, caught up - encourage growth with milestone context
    if (totalWords < SMALL_VOCABULARY_THRESHOLD) {
      const milestoneHint =
        milestone && milestone.remaining <= 5
          ? ` Just ${milestone.remaining} away from ${milestone.target}!`
          : '';
      const streakContext =
        currentStreak && currentStreak > 0 ? ` ${currentStreak}-day streak going strong!` : '';

      return {
        message: `All caught up at ${memoryStrength}% Memory Strength! With ${totalWords} words, you have room to grow from articles you enjoy.${milestoneHint}${streakContext}`,
        type: 'add_words',
      };
    }

    // State 6: Established vocabulary, caught up - explain optimization with streak context
    const milestoneHint =
      milestone && milestone.remaining <= 10
        ? ` ${milestone.remaining} more to reach ${milestone.target}!`
        : '';
    const streakContext =
      currentStreak && currentStreak > 0 && reviewedToday
        ? ` ${currentStreak}-day streak grows stronger!`
        : currentStreak && currentStreak > 0
          ? ` ${currentStreak}-day streak protected.`
          : '';

    return {
      message: `All caught up with ${masteredWords} words mastered! Next review ${nextDueText} — longer gaps build deeper memory.${milestoneHint}${streakContext}`,
      type: 'balanced',
    };
  }, [studyWords, dueWordsCount, currentRetention, learningWords, masteredWords, currentStreak]);
}
