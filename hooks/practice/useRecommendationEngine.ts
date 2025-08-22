import { useMemo } from 'react';

import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';

export interface RecommendationData {
  message: string;
  indicator: 'green' | 'orange' | 'red';
  type: 'add_words' | 'review_focus' | 'balance' | 'getting_started';
}

interface RecommendationEngineParams {
  studyWords: StudyWord[];
  dueWordsCount: number;
  currentRetention: number;
  learningWords: number;
  masteredWords: number;
  trend: 'improving' | 'declining' | 'stable';
}

// Constants for optimization
const BEGINNER_THRESHOLD = 50;
const ESTABLISHED_VOCABULARY_THRESHOLD = 100;
const HEAVY_LEARNING_THRESHOLD = 0.4;
const UPCOMING_DAYS_TO_CHECK = 3;
const DUE_WORDS_BASE_THRESHOLD = 3;
const UPCOMING_LOAD_BASE_THRESHOLD = 5;

// Optimized helper functions
function calculateUpcomingDueWords(studyWords: StudyWord[]): number {
  if (studyWords.length === 0) return 0;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let upcomingDueWords = 0;

  // Pre-calculate date ranges for better performance
  const dateRanges: Date[] = [];
  for (let i = 1; i <= UPCOMING_DAYS_TO_CHECK; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    futureDate.setHours(23, 59, 59, 999);
    dateRanges.push(futureDate);
  }

  // Single pass through study words for all date ranges
  for (const word of studyWords) {
    if (!word.fsrs_due) continue;
    const dueDate = new Date(word.fsrs_due);

    for (let i = 0; i < dateRanges.length; i++) {
      if (dueDate <= dateRanges[i]) {
        upcomingDueWords++;
        break; // Word is due within this range, no need to check further dates
      }
    }
  }

  return upcomingDueWords;
}

interface UserState {
  isBeginner: boolean;
  hasHighRetention: boolean;
  hasModerateRetention: boolean;
  hasLowRetention: boolean;
}

interface ReviewState {
  hasDueWords: boolean;
  hasManyDueWords: boolean;
  hasUpcomingLoad: boolean;
  isDeclining: boolean;
}

interface LearningState {
  isInHeavyLearningPhase: boolean;
  hasEstablishedVocabulary: boolean;
  learningProgressRatio: number;
}

function getUserState(totalWords: number, currentRetention: number): UserState {
  const isBeginner = totalWords < BEGINNER_THRESHOLD;
  const hasHighRetention = currentRetention >= MEMORY_CAPACITY_THRESHOLDS.GOOD;
  const hasModerateRetention =
    currentRetention >= MEMORY_CAPACITY_THRESHOLDS.POOR &&
    currentRetention < MEMORY_CAPACITY_THRESHOLDS.MODERATE;
  const hasLowRetention = currentRetention < MEMORY_CAPACITY_THRESHOLDS.POOR;

  return { isBeginner, hasHighRetention, hasModerateRetention, hasLowRetention };
}

function getReviewState(
  totalWords: number,
  dueWordsCount: number,
  upcomingDueWords: number,
  trend: 'improving' | 'declining' | 'stable'
): ReviewState {
  const hasDueWords = dueWordsCount > 0;
  const hasManyDueWords =
    dueWordsCount >= Math.max(DUE_WORDS_BASE_THRESHOLD, Math.floor(totalWords * 0.1));
  const hasUpcomingLoad =
    upcomingDueWords >= Math.max(UPCOMING_LOAD_BASE_THRESHOLD, Math.floor(totalWords * 0.15));
  const isDeclining = trend === 'declining';

  return { hasDueWords, hasManyDueWords, hasUpcomingLoad, isDeclining };
}

function getLearningState(
  totalWords: number,
  learningWords: number,
  masteredWords: number
): LearningState {
  const isInHeavyLearningPhase = learningWords > totalWords * HEAVY_LEARNING_THRESHOLD;
  const hasEstablishedVocabulary = totalWords >= ESTABLISHED_VOCABULARY_THRESHOLD;
  const learningProgressRatio = masteredWords / Math.max(1, totalWords);

  return { isInHeavyLearningPhase, hasEstablishedVocabulary, learningProgressRatio };
}

// Pre-computed recommendation messages for better performance
const RECOMMENDATION_MESSAGES = {
  GETTING_STARTED: 'Start building your vocabulary by adding words from articles you read.',

  // Due words priority messages
  DUE_WORDS_MANY_LOW_RETENTION:
    'Multiple words are due for review and your retention is low. Focus on completing your review sessions to rebuild your memory foundation.',
  DUE_WORDS_MANY:
    'You have several words waiting for review. Complete your practice sessions to maintain optimal spacing intervals.',
  DUE_WORDS_SINGLE:
    'You have words due for review. Keep up with your practice sessions to maintain effective spaced repetition.',

  // Learning phase messages
  HEAVY_LEARNING_PHASE:
    'You have many words in the learning phase. Focus on consolidating these before adding new vocabulary to avoid cognitive overload.',

  // Beginner messages
  BEGINNER_HIGH_RETENTION:
    'Your retention is strong for a beginner. You can gradually add new words while maintaining regular review sessions.',
  BEGINNER_DEFAULT:
    'Building a solid foundation is key. Continue with regular practice sessions to help FSRS optimize your learning intervals.',

  // Established learner messages
  ESTABLISHED_HIGH_RETENTION_NO_LOAD:
    'Your vocabulary is well-established with strong retention. You can confidently add new words while maintaining review consistency.',
  ESTABLISHED_HIGH_RETENTION_WITH_LOAD:
    'Your retention is good, but you have a busy review schedule ahead. Consider adding fewer new words until your review load lightens.',

  // Moderate retention messages
  MODERATE_GOOD_PROGRESS:
    "You're progressing well through your vocabulary. Keep reviewing consistently and add new words gradually.",
  MODERATE_NEEDS_ATTENTION:
    'Focus on completing your review sessions consistently. This will help FSRS optimize your intervals and improve retention.',

  // Low retention messages
  LOW_RETENTION:
    'Your retention needs attention. Prioritize completing all review sessions to help FSRS recalculate optimal intervals.',

  // Default messages
  BALANCED_ESTABLISHED:
    "You're doing well with spaced repetition! Continue regular practice and consider adding new words as your schedule allows.",
  BALANCED_DEFAULT:
    'Continue with regular practice sessions. Consistent reviews help FSRS optimize your learning intervals over time.',
} as const;

/**
 * Analyzes user data and generates intelligent recommendations for vocabulary learning
 * Based on spaced repetition principles and memory retention metrics
 */
export function useRecommendationEngine({
  studyWords = [],
  dueWordsCount = 0,
  currentRetention = 0,
  learningWords = 0,
  masteredWords = 0,
  trend = 'stable',
}: RecommendationEngineParams): RecommendationData | null {
  return useMemo(() => {
    const totalWords = studyWords.length;

    // Early return if no words - getting started phase
    if (totalWords === 0) {
      return {
        message: RECOMMENDATION_MESSAGES.GETTING_STARTED,
        indicator: 'green' as const,
        type: 'getting_started' as const,
      };
    }

    // Optimized calculations using helper functions
    const upcomingDueWords = calculateUpcomingDueWords(studyWords);
    const userState: UserState = getUserState(totalWords, currentRetention);
    const reviewState: ReviewState = getReviewState(
      totalWords,
      dueWordsCount,
      upcomingDueWords,
      trend
    );
    const learningState: LearningState = getLearningState(totalWords, learningWords, masteredWords);

    // Extract values for cleaner code
    const { isBeginner, hasHighRetention, hasModerateRetention, hasLowRetention } = userState;
    const { hasDueWords, hasManyDueWords, hasUpcomingLoad, isDeclining } = reviewState;
    const { isInHeavyLearningPhase, hasEstablishedVocabulary, learningProgressRatio } =
      learningState;

    // Generate recommendation based on spaced repetition principles

    // PRIORITY 1: Any due words require immediate attention (spaced repetition principle)
    if (hasDueWords) {
      if (hasManyDueWords && hasLowRetention) {
        return {
          message: RECOMMENDATION_MESSAGES.DUE_WORDS_MANY_LOW_RETENTION,
          indicator: 'red' as const,
          type: 'review_focus' as const,
        };
      }

      if (hasManyDueWords) {
        return {
          message: RECOMMENDATION_MESSAGES.DUE_WORDS_MANY,
          indicator: 'orange' as const,
          type: 'review_focus' as const,
        };
      }

      return {
        message: RECOMMENDATION_MESSAGES.DUE_WORDS_SINGLE,
        indicator: 'orange' as const,
        type: 'review_focus' as const,
      };
    }

    // PRIORITY 2: Consider learning phase and cognitive load
    if (isInHeavyLearningPhase) {
      return {
        message: RECOMMENDATION_MESSAGES.HEAVY_LEARNING_PHASE,
        indicator: 'orange' as const,
        type: 'review_focus' as const,
      };
    }

    // PRIORITY 3: Beginner guidance (needs sufficient data for FSRS optimization)
    if (isBeginner) {
      if (hasHighRetention) {
        return {
          message: RECOMMENDATION_MESSAGES.BEGINNER_HIGH_RETENTION,
          indicator: 'green' as const,
          type: 'balance' as const,
        };
      }

      return {
        message: RECOMMENDATION_MESSAGES.BEGINNER_DEFAULT,
        indicator: 'green' as const,
        type: 'review_focus' as const,
      };
    }

    // PRIORITY 4: Established learners with good retention
    if (hasEstablishedVocabulary && hasHighRetention && !hasUpcomingLoad) {
      return {
        message: RECOMMENDATION_MESSAGES.ESTABLISHED_HIGH_RETENTION_NO_LOAD,
        indicator: 'green' as const,
        type: 'add_words' as const,
      };
    }

    // PRIORITY 5: High retention but upcoming review load
    if (hasHighRetention && hasUpcomingLoad) {
      return {
        message: RECOMMENDATION_MESSAGES.ESTABLISHED_HIGH_RETENTION_WITH_LOAD,
        indicator: 'orange' as const,
        type: 'balance' as const,
      };
    }

    // PRIORITY 6: Moderate retention scenarios
    if (hasModerateRetention) {
      if (learningProgressRatio > 0.5) {
        return {
          message: RECOMMENDATION_MESSAGES.MODERATE_GOOD_PROGRESS,
          indicator: 'green' as const,
          type: 'balance' as const,
        };
      }

      return {
        message: RECOMMENDATION_MESSAGES.MODERATE_NEEDS_ATTENTION,
        indicator: 'orange' as const,
        type: 'review_focus' as const,
      };
    }

    // PRIORITY 7: Low retention or declining trend
    if (hasLowRetention || isDeclining) {
      return {
        message: RECOMMENDATION_MESSAGES.LOW_RETENTION,
        indicator: 'red' as const,
        type: 'review_focus' as const,
      };
    }

    // DEFAULT: Balanced approach for established learners
    if (hasEstablishedVocabulary && learningProgressRatio > 0.6) {
      return {
        message: RECOMMENDATION_MESSAGES.BALANCED_ESTABLISHED,
        indicator: 'green' as const,
        type: 'balance' as const,
      };
    }

    // Fallback for all other scenarios
    return {
      message: RECOMMENDATION_MESSAGES.BALANCED_DEFAULT,
      indicator: 'green' as const,
      type: 'balance' as const,
    };
  }, [studyWords, dueWordsCount, currentRetention, learningWords, masteredWords, trend]);
}
