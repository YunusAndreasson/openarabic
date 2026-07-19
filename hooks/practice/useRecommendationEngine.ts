import { useMemo, useState } from 'react';

import { DUE_BACKLOG_ADD_THRESHOLD } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { calculateNextDueDate, formatNextDue } from '@/utils/fsrsUtils';
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

// Milestone targets and celebration windows
const WORD_MILESTONES = [10, 25, 50, 100, 200, 300, 500];
const WORD_MILESTONE_WINDOW = 3;
const STREAK_MILESTONES = [7, 30, 60, 100, 365];

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
 * Select a message from a pool using deterministic day-based rotation.
 * Same message all day, different tomorrow. No storage needed.
 */
function selectFromPool(pool: readonly string[], dayIndex: number): string {
  return pool[dayIndex % pool.length] ?? pool[0] ?? '';
}

/**
 * Check for milestone achievements using a celebration window.
 * Word milestones show for WORD_MILESTONE_WINDOW words past the target.
 * Streak milestones show on the exact day only.
 * Checks highest milestone first to avoid showing stale lower ones.
 */
function getMilestoneMessage(masteredWords: number, currentStreak?: number): string | null {
  // Check word milestones (highest first, with celebration window)
  for (let i = WORD_MILESTONES.length - 1; i >= 0; i--) {
    const target = WORD_MILESTONES[i];
    if (
      target !== undefined &&
      masteredWords >= target &&
      masteredWords < target + WORD_MILESTONE_WINDOW
    ) {
      return getWordMilestoneText(target);
    }
  }

  // Check streak milestones (exact match only — streaks increment daily)
  if (currentStreak) {
    for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
      if (currentStreak === STREAK_MILESTONES[i]) {
        return getStreakMilestoneText(currentStreak);
      }
    }
  }

  return null;
}

function getWordMilestoneText(target: number): string {
  switch (target) {
    case 10:
      return "10 words mastered! You've built a foundation for long-term memory.";
    case 25:
      return "25 words mastered! Building your first 25 takes real dedication — you've proven you can learn Arabic consistently.";
    case 50:
      return '50 words mastered! A strong start. Reviewing at increasing intervals moves these words into long-term memory.';
    case 100:
      return '100 words mastered! A vocabulary this size makes reading Arabic noticeably easier.';
    case 200:
      return '200 words mastered! You now recognize many of the most frequent Arabic words. Reading becomes genuinely enjoyable.';
    case 300:
      return "300 words mastered! You've reached intermediate vocabulary. Context clues now help you guess unfamiliar words.";
    case 500:
      return '500 words mastered! A rich vocabulary that makes Arabic texts far more accessible.';
    default:
      return `${target} words mastered!`;
  }
}

function getStreakMilestoneText(streak: number): string {
  switch (streak) {
    case 7:
      return '7-day streak! One week of consistency — keep building this daily habit.';
    case 30:
      return '30-day streak! A full month. Your brain has adapted to expect daily Arabic practice — this is now becoming automatic.';
    case 60:
      return "60-day streak! Two months of daily practice. At this point, skipping a day would feel wrong. That's habit formation at work.";
    case 100:
      return '100-day streak! This level of consistency is truly exceptional. Arabic is now part of your daily life.';
    case 365:
      return "365-day streak! A full year of daily practice. You've proven extraordinary dedication to learning Arabic.";
    default:
      return `${streak}-day streak!`;
  }
}

/**
 * Enriched recommendation engine with educational context and smart insights.
 * Messages are forward-looking and avoid restating data visible in the gauge/stat cards.
 * Uses day-based rotation for variety within each state.
 */
export function useRecommendationEngine({
  studyWords = [],
  dueWordsCount = 0,
  currentRetention = 0,
  learningWords = 0,
  masteredWords = 0,
  currentStreak,
}: RecommendationEngineParams): RecommendationData {
  // Day-based rotation index — captured once per mount to keep recommendation
  // memos pure across re-renders within the same day.
  const [dayIndex] = useState(() => Math.floor(Date.now() / 86400000));

  return useMemo(() => {
    const totalWords = studyWords.length;
    const nextDue = calculateNextDueDate(studyWords);
    const nextDueText = formatNextDue(nextDue);
    const isLowRetention = currentRetention < LOW_RETENTION_THRESHOLD;
    const hasManyDue = dueWordsCount >= MANY_DUE_THRESHOLD;

    // Smart insights calculations
    const hardWordsCount = countHardWords(studyWords);
    const tomorrowDue = countUpcomingDue(studyWords, 1);
    const milestone = getNextMilestone(masteredWords);

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

    // State 2a: Large backlog — adding is paused (mirrors the due-backlog
    // intake gate); explain the state and the way out before other due messaging.
    if (dueWordsCount >= DUE_BACKLOG_ADD_THRESHOLD) {
      return {
        message: selectFromPool(STRINGS.RECOMMENDATION_BACKLOG_POOL, dayIndex),
        type: 'review',
      };
    }

    // State 2: Due words + low memory strength - reframe as opportunity
    if (dueWordsCount > 0 && isLowRetention) {
      const baseMessage = selectFromPool(STRINGS.RECOMMENDATION_LOW_RETENTION_POOL, dayIndex);
      const hardWordsContext =
        hardWordsCount >= 3 ? ` ${hardWordsCount} words need extra reps.` : '';
      return {
        message: `${baseMessage}${hardWordsContext}`,
        type: 'review',
      };
    }

    // State 3: Due words (normal) - explain why reviewing now matters
    if (dueWordsCount > 0) {
      const upcomingContext = tomorrowDue > 0 ? ` ${tomorrowDue} more tomorrow.` : '';

      if (hasManyDue) {
        const baseMessage = selectFromPool(STRINGS.RECOMMENDATION_DUE_MANY_POOL, dayIndex);
        return {
          message: `${baseMessage}${upcomingContext}`,
          type: 'review',
        };
      }
      const baseMessage = selectFromPool(STRINGS.RECOMMENDATION_DUE_FEW_POOL, dayIndex);
      return {
        message: `${baseMessage}${upcomingContext}`,
        type: 'review',
      };
    }

    // State 4a: Heavy learning load (>70%) - brain at capacity
    if (isHeavyLoad) {
      const baseMessage = selectFromPool(STRINGS.RECOMMENDATION_HEAVY_LOAD_POOL, dayIndex);
      return {
        message: `${baseMessage} Next batch due ${nextDueText}.`,
        type: 'consolidate',
      };
    }

    // State 4b: Moderate learning load (50-70%) - balanced guidance
    if (isModerateLoad) {
      const baseMessage = selectFromPool(STRINGS.RECOMMENDATION_MODERATE_LOAD_POOL, dayIndex);
      const milestoneHint =
        milestone && milestone.remaining <= 5
          ? ` Just ${milestone.remaining} away from ${milestone.target} mastered!`
          : '';
      return {
        message: `${baseMessage}${milestoneHint}`,
        type: 'consolidate',
      };
    }

    // State 5: Small vocabulary, caught up - encourage growth
    if (totalWords < SMALL_VOCABULARY_THRESHOLD) {
      const baseMessage = selectFromPool(STRINGS.RECOMMENDATION_SMALL_CAUGHT_UP_POOL, dayIndex);
      const milestoneHint =
        milestone && milestone.remaining <= 5
          ? ` Just ${milestone.remaining} away from ${milestone.target}!`
          : '';
      const streakContext =
        currentStreak && currentStreak > 1 ? ` ${currentStreak}-day streak going strong!` : '';

      return {
        message: `${baseMessage}${milestoneHint}${streakContext}`,
        type: 'add_words',
      };
    }

    // State 6: Established vocabulary, caught up - forward-looking with streak context
    const baseMessage = selectFromPool(STRINGS.RECOMMENDATION_BALANCED_POOL, dayIndex);
    const milestoneHint =
      milestone && milestone.remaining <= 10
        ? ` ${milestone.remaining} more to reach ${milestone.target} mastered!`
        : '';
    const streakContext =
      currentStreak && currentStreak > 1 ? ` ${currentStreak}-day streak going strong!` : '';
    const nextDueContext = nextDue ? ` Next review ${nextDueText}.` : '';

    return {
      message: `${baseMessage}${nextDueContext}${milestoneHint}${streakContext}`,
      type: 'balanced',
    };
  }, [studyWords, dueWordsCount, currentRetention, learningWords, masteredWords, currentStreak]);
}
