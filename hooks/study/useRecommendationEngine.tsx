import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { calculateNextDueDate } from '@/utils/fsrsUtils';

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
const STRUGGLING_LAPSES_THRESHOLD = 3;
const WEAK_STABILITY_THRESHOLD = 5;

// Milestone targets
const WORD_MILESTONES = [10, 25, 50, 100, 200, 300, 500];

/**
 * Count words that are struggling (high lapses or weak stability)
 */
function countStrugglingWords(studyWords: StudyWord[]): number {
  return studyWords.filter(w => {
    const lapses = w.fsrs_lapses ?? 0;
    const state = w.fsrs_state ?? 0;
    const stability = w.fsrs_stability ?? 0;
    // Forgotten 3+ times OR in review/relearning with weak stability
    return (
      lapses >= STRUGGLING_LAPSES_THRESHOLD ||
      ((state === 2 || state === 3) && stability < WEAK_STABILITY_THRESHOLD)
    );
  }).length;
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
 * Calculate number of words reviewed in the last 7 days
 */
function calculateWeeklyReviews(studyWords: StudyWord[]): number {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return studyWords.filter(word => {
    const lastReview = word.fsrs_last_review;
    if (!lastReview) return false;
    return new Date(lastReview).getTime() >= oneWeekAgo;
  }).length;
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
    return "🎉 10 words mastered! You've built a foundation. Each of these passed 4+ reviews, proving they're moving to long-term memory.";
  }
  if (masteredWords === 25) {
    return "🎉 25 words mastered! Research shows the first 25 words are the hardest—you've proven you can learn Arabic vocabulary consistently.";
  }
  if (masteredWords === 50) {
    return '🎉 50 words mastered! This covers basic Arabic comprehension. Reviewing at increasing intervals moves words into long-term memory.';
  }
  if (masteredWords === 100) {
    return "🎉 100 words mastered! Studies show this covers ~50% of everyday Arabic text. You're building real reading ability.";
  }
  if (masteredWords === 200) {
    return '🎉 200 words mastered! You now recognize most common Arabic words. At this level, reading becomes genuinely enjoyable.';
  }
  if (masteredWords === 300) {
    return "🎉 300 words mastered! You've reached intermediate vocabulary. Context clues now help you guess unfamiliar words.";
  }
  if (masteredWords === 500) {
    return '🎉 500 words mastered! This is advanced vocabulary territory. You can understand most Arabic content with minimal dictionary help.';
  }

  // Check streak milestones
  if (currentStreak === 7) {
    return "🔥 7-day streak! One week of consistency. Research shows habits form around day 21—you're 1/3 of the way there.";
  }
  if (currentStreak === 30) {
    return '🔥 30-day streak! A full month. Your brain has adapted to expect daily Arabic practice—this is now becoming automatic.';
  }
  if (currentStreak === 60) {
    return "🔥 60-day streak! Two months of daily practice. At this point, skipping a day would feel wrong. That's habit formation at work.";
  }
  if (currentStreak === 100) {
    return '🔥 100-day streak! This level of consistency puts you in the top 1% of language learners. Arabic is now part of your identity.';
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
    const weeklyReviews = calculateWeeklyReviews(studyWords);
    const nextDue = calculateNextDueDate(studyWords);
    const nextDueText = formatNextDue(nextDue);
    const isLowRetention = currentRetention < LOW_RETENTION_THRESHOLD;
    const memoryStrength = Math.round(currentRetention);
    const hasManyDue = dueWordsCount >= MANY_DUE_THRESHOLD;

    // Smart insights calculations
    const strugglingCount = countStrugglingWords(studyWords);
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

    // State 1: No words - getting started with science context
    if (totalWords === 0) {
      return {
        message:
          'Start by adding 10-15 words from articles. Your brain learns best in small batches—it consolidates them during sleep, turning short-term memories into lasting knowledge.',
        type: 'start',
      };
    }

    // State 2: Due words + low memory strength - urgent with struggling words context
    if (dueWordsCount > 0 && isLowRetention) {
      const strugglingContext =
        strugglingCount >= 3
          ? ` ${strugglingCount} words have been difficult—they'll appear more often until they stick.`
          : '';
      return {
        message: `Your Memory Strength is at ${memoryStrength}%—below 50% means words are at risk of being forgotten. Each review now rebuilds the memory trace.${strugglingContext}`,
        type: 'review',
      };
    }

    // State 3: Due words (normal) - review with upcoming load preview
    if (dueWordsCount > 0) {
      const upcomingContext =
        tomorrowDue > 0
          ? ` Heads up: ${tomorrowDue} more ${tomorrowDue === 1 ? 'word' : 'words'} due tomorrow.`
          : '';

      if (hasManyDue) {
        return {
          message: `${dueWordsCount} words are due—reviewing now at ${memoryStrength}% Memory Strength prevents the forgetting curve from taking hold.${upcomingContext}`,
          type: 'review',
        };
      }
      return {
        message: `Just ${dueWordsCount} word${dueWordsCount === 1 ? '' : 's'} due. Quick review keeps your ${memoryStrength}% Memory Strength strong—these appear right before you'd forget, which strengthens retention.${upcomingContext}`,
        type: 'review',
      };
    }

    // State 4a: Heavy learning load (>70%) - brain at capacity
    if (isHeavyLoad) {
      return {
        message: `${learningWords} words are in active learning—your brain is forming new neural connections. Research shows sleep consolidates these memories. Focus on reviews before adding more; next batch due ${nextDueText}.`,
        type: 'consolidate',
      };
    }

    // State 4b: Moderate learning load (50-70%) - balanced guidance
    if (isModerateLoad) {
      const milestoneHint =
        milestone && milestone.remaining <= 5
          ? ` Just ${milestone.remaining} more to reach ${milestone.target} mastered!`
          : '';
      return {
        message: `${learningWords} words are growing stronger with each review. You can add a few more, but prioritize reviews when they come due—consistency beats volume.${milestoneHint}`,
        type: 'consolidate',
      };
    }

    // State 5: Small vocabulary, caught up - encourage growth with milestone context
    if (totalWords < SMALL_VOCABULARY_THRESHOLD) {
      const weeklyContext =
        weeklyReviews > 0 ? `You've reviewed ${weeklyReviews} words this week. ` : '';
      const milestoneHint =
        milestone && milestone.remaining <= 5
          ? ` Just ${milestone.remaining} more to reach ${milestone.target} mastered! 🎯`
          : '';
      const streakContext =
        currentStreak && currentStreak > 0 && !reviewedToday && dueWordsCount === 0
          ? ` Your ${currentStreak}-day streak is safe—next words due ${nextDueText}.`
          : '';

      return {
        message: `All caught up! ${weeklyContext}Your ${memoryStrength}% Memory Strength shows strong retention. With ${totalWords} words, you have room to grow—adding from articles you enjoy creates stronger memory connections.${milestoneHint}${streakContext}`,
        type: 'add_words',
      };
    }

    // State 6: Established vocabulary, caught up - explain optimization with streak context
    const streakContext =
      currentStreak && currentStreak > 0 && reviewedToday
        ? ` Your ${currentStreak}-day streak grows stronger!`
        : currentStreak && currentStreak > 0
          ? ` Your ${currentStreak}-day streak is protected—next review ${nextDueText}.`
          : '';
    const milestoneHint =
      milestone && milestone.remaining <= 10
        ? ` ${milestone.remaining} more words to reach ${milestone.target} mastered.`
        : '';

    return {
      message: `All caught up with ${masteredWords} words mastered!${streakContext} Your Memory Strength may dip slightly before your next review ${nextDueText}—longer gaps between reviews build deeper memory.${milestoneHint}`,
      type: 'balanced',
    };
  }, [studyWords, dueWordsCount, currentRetention, learningWords, masteredWords, currentStreak]);
}
