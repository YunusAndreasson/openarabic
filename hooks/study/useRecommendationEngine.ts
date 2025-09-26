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

const VOCABULARY_PROGRESSION_THRESHOLDS = {
  ABSOLUTE_BEGINNER: 0, // 0 words: complete beginner
  EARLY_LEARNER: 25, // 1-25 words: just getting started
  BUILDING_FOUNDATION: 50, // 26-50 words: building vocabulary foundation
  DEVELOPING_VOCABULARY: 100, // 51-100 words: developing substantial vocabulary
  ESTABLISHED: 100, // 100+ words: established vocabulary
} as const;

const OPTIMAL_VOCABULARY_RANGES = {
  BEGINNER_OPTIMAL: 30, // Optimal range for beginners: 15-30 words
  INTERMEDIATE_OPTIMAL: 60, // Optimal range for intermediate: 45-60 words
  ADVANCED_OPTIMAL: 120, // Optimal range for advanced: 90-120 words
} as const;

const LEARNING_LOAD_THRESHOLDS = {
  LIGHT: 0.3, // 30% learning words - can safely add more
  MODERATE: 0.5, // 50% learning words - add with some caution
  HEAVY: 0.7, // 70% learning words - focus on consolidation
} as const;

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
      const dateRange = dateRanges[i];
      if (dateRange && dueDate <= dateRange) {
        upcomingDueWords++;
        break; // Word is due within this range, no need to check further dates
      }
    }
  }

  return upcomingDueWords;
}

interface UserState {
  hasHighRetention: boolean;
  hasModerateRetention: boolean;
  hasLowRetention: boolean;
  vocabularyStage:
    | 'absolute_beginner'
    | 'early_learner'
    | 'building_foundation'
    | 'developing_vocabulary'
    | 'established';
  isInOptimalRange: boolean;
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
  learningLoadLevel: 'light' | 'moderate' | 'heavy';
  canSafelyAddWords: boolean;
}

function getUserState(totalWords: number, currentRetention: number): UserState {
  let vocabularyStage: UserState['vocabularyStage'];
  let optimalRange: number;

  if (totalWords === 0) {
    vocabularyStage = 'absolute_beginner';
    optimalRange = OPTIMAL_VOCABULARY_RANGES.BEGINNER_OPTIMAL;
  } else if (totalWords <= VOCABULARY_PROGRESSION_THRESHOLDS.EARLY_LEARNER) {
    vocabularyStage = 'early_learner';
    optimalRange = OPTIMAL_VOCABULARY_RANGES.BEGINNER_OPTIMAL;
  } else if (totalWords <= VOCABULARY_PROGRESSION_THRESHOLDS.BUILDING_FOUNDATION) {
    vocabularyStage = 'building_foundation';
    optimalRange = OPTIMAL_VOCABULARY_RANGES.INTERMEDIATE_OPTIMAL;
  } else if (totalWords <= VOCABULARY_PROGRESSION_THRESHOLDS.DEVELOPING_VOCABULARY) {
    vocabularyStage = 'developing_vocabulary';
    optimalRange = OPTIMAL_VOCABULARY_RANGES.ADVANCED_OPTIMAL;
  } else {
    vocabularyStage = 'established';
    optimalRange = OPTIMAL_VOCABULARY_RANGES.ADVANCED_OPTIMAL;
  }

  // Check if user is in optimal vocabulary range
  const isInOptimalRange = Math.abs(totalWords - optimalRange) <= optimalRange * 0.25; // Within 25% of optimal

  const hasHighRetention = currentRetention >= MEMORY_CAPACITY_THRESHOLDS.GOOD;
  const hasModerateRetention =
    currentRetention >= MEMORY_CAPACITY_THRESHOLDS.POOR &&
    currentRetention < MEMORY_CAPACITY_THRESHOLDS.MODERATE;
  const hasLowRetention = currentRetention < MEMORY_CAPACITY_THRESHOLDS.POOR;

  return {
    hasHighRetention,
    hasModerateRetention,
    hasLowRetention,
    vocabularyStage,
    isInOptimalRange,
  };
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
  const learningRatio = totalWords > 0 ? learningWords / totalWords : 0;
  const learningProgressRatio = masteredWords / Math.max(1, totalWords);

  let learningLoadLevel: LearningState['learningLoadLevel'];
  if (learningRatio <= LEARNING_LOAD_THRESHOLDS.LIGHT) {
    learningLoadLevel = 'light';
  } else if (learningRatio <= LEARNING_LOAD_THRESHOLDS.MODERATE) {
    learningLoadLevel = 'moderate';
  } else {
    learningLoadLevel = 'heavy';
  }

  const isInHeavyLearningPhase = learningRatio > LEARNING_LOAD_THRESHOLDS.HEAVY;

  // New logic: can safely add words based on learning load and vocabulary size
  const canSafelyAddWords = (() => {
    // Always allow adding words for very small vocabularies
    if (totalWords < 10) return true;

    // For very small vocabularies (10-20), be generous with learning load
    if (totalWords <= 20) {
      return learningRatio < LEARNING_LOAD_THRESHOLDS.HEAVY;
    }

    // For small vocabularies (21-30), allow moderate learning load
    if (totalWords <= 30) {
      return learningRatio < LEARNING_LOAD_THRESHOLDS.MODERATE;
    }

    // For medium vocabularies (31-60), be more cautious
    if (totalWords <= 60) {
      return learningRatio < LEARNING_LOAD_THRESHOLDS.LIGHT;
    }

    // For larger vocabularies, be more conservative
    return learningRatio < LEARNING_LOAD_THRESHOLDS.LIGHT * 0.8;
  })();

  const hasEstablishedVocabulary = totalWords >= VOCABULARY_PROGRESSION_THRESHOLDS.ESTABLISHED;

  return {
    isInHeavyLearningPhase,
    hasEstablishedVocabulary,
    learningProgressRatio,
    learningLoadLevel,
    canSafelyAddWords,
  };
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

  // Absolute beginner messages (0 words)
  ABSOLUTE_BEGINNER_READY:
    'Welcome! Start by adding 10-15 words from articles you read to begin building your Arabic vocabulary foundation.',

  // Early learner messages (1-25 words) - more encouraging
  EARLY_LEARNER_CAN_ADD:
    'Great progress! You have a solid start. Keep adding words from articles and maintain regular review sessions to accelerate your learning.',
  EARLY_LEARNER_REVIEW_FIRST:
    "Perfect timing! Complete your review session to strengthen what you've learned, then keep adding new vocabulary to build momentum.",

  // Building foundation messages (26-50 words) - balanced approach
  BUILDING_FOUNDATION_CAN_ADD:
    "You're building a strong foundation! Keep up regular review sessions while adding new words to accelerate your progress.",
  BUILDING_FOUNDATION_CONSOLIDATE:
    'Focus on review sessions to consolidate your learning foundation. Regular practice will help these words move to long-term memory.',
  BUILDING_FOUNDATION_OPTIMAL:
    "Perfect! You're in an optimal vocabulary range. Regular review sessions combined with gradual word addition will maximize your learning efficiency.",

  // Learning phase messages - more nuanced
  LIGHT_LEARNING_LOAD:
    'Your learning load is light. Regular review sessions will help maintain your progress while you add new vocabulary.',
  MODERATE_LEARNING_LOAD:
    'Keep up with regular review sessions to manage your moderate learning load effectively and optimize your retention.',
  HEAVY_LEARNING_LOAD:
    'Focus on review sessions to consolidate your learning. Regular practice is key to moving words into long-term memory.',

  // Established learner messages
  ESTABLISHED_HIGH_RETENTION_NO_LOAD:
    'Excellent retention! Keep up regular review sessions to maintain your strong memory performance while expanding your vocabulary.',
  ESTABLISHED_HIGH_RETENTION_WITH_LOAD:
    'Your retention is strong. Stay consistent with review sessions to manage your schedule effectively and maintain optimal learning intervals.',

  // Moderate retention messages
  MODERATE_GOOD_PROGRESS:
    'Great progress! Consistent review sessions will help maintain and improve your retention as you continue building your vocabulary.',
  MODERATE_NEEDS_ATTENTION:
    'Review sessions are key to improving your retention. Consistent practice will help FSRS optimize your learning intervals for better results.',

  // Low retention messages
  LOW_RETENTION:
    'Your retention needs attention. Prioritize completing all review sessions to help FSRS recalculate optimal intervals.',

  // Default messages - encourage review even when no words are due
  BALANCED_ESTABLISHED:
    'Great progress! Even when no words are due, regular review sessions strengthen your memory and help FSRS optimize your learning schedule.',
  BALANCED_DEFAULT:
    'Keep up the momentum! Review sessions help maintain your learning progress, even when no words are currently due for study.',
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
    const {
      hasHighRetention,
      hasModerateRetention,
      hasLowRetention,
      vocabularyStage,
      isInOptimalRange,
    } = userState;
    const { hasDueWords, hasManyDueWords, hasUpcomingLoad, isDeclining } = reviewState;
    const {
      isInHeavyLearningPhase,
      hasEstablishedVocabulary,
      learningProgressRatio,
      learningLoadLevel,
      canSafelyAddWords,
    } = learningState;

    // Generate recommendation based on vocabulary progression and spaced repetition principles

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

    // PRIORITY 2: Absolute beginner (0 words) - special case
    if (vocabularyStage === 'absolute_beginner') {
      return {
        message: RECOMMENDATION_MESSAGES.ABSOLUTE_BEGINNER_READY,
        indicator: 'green' as const,
        type: 'add_words' as const,
      };
    }

    // PRIORITY 3: Early learner stage (1-25 words) - be encouraging and focus on growth
    if (vocabularyStage === 'early_learner') {
      if (canSafelyAddWords) {
        return {
          message: RECOMMENDATION_MESSAGES.EARLY_LEARNER_CAN_ADD,
          indicator: 'green' as const,
          type: 'add_words' as const,
        };
      }

      return {
        message: RECOMMENDATION_MESSAGES.EARLY_LEARNER_REVIEW_FIRST,
        indicator: 'orange' as const,
        type: 'review_focus' as const,
      };
    }

    // PRIORITY 4: Building foundation stage (26-50 words) - balance adding and consolidating
    if (vocabularyStage === 'building_foundation') {
      if (isInOptimalRange) {
        return {
          message: RECOMMENDATION_MESSAGES.BUILDING_FOUNDATION_OPTIMAL,
          indicator: 'green' as const,
          type: 'balance' as const,
        };
      }

      if (canSafelyAddWords) {
        return {
          message: RECOMMENDATION_MESSAGES.BUILDING_FOUNDATION_CAN_ADD,
          indicator: 'green' as const,
          type: 'add_words' as const,
        };
      }

      return {
        message: RECOMMENDATION_MESSAGES.BUILDING_FOUNDATION_CONSOLIDATE,
        indicator: 'orange' as const,
        type: 'review_focus' as const,
      };
    }

    // PRIORITY 5: Learning load based recommendations (all stages)
    if (learningLoadLevel === 'heavy' || isInHeavyLearningPhase) {
      return {
        message: RECOMMENDATION_MESSAGES.HEAVY_LEARNING_LOAD,
        indicator: 'orange' as const,
        type: 'review_focus' as const,
      };
    }

    if (learningLoadLevel === 'moderate') {
      return {
        message: RECOMMENDATION_MESSAGES.MODERATE_LEARNING_LOAD,
        indicator: 'orange' as const,
        type: 'balance' as const,
      };
    }

    if (learningLoadLevel === 'light' && canSafelyAddWords) {
      return {
        message: RECOMMENDATION_MESSAGES.LIGHT_LEARNING_LOAD,
        indicator: 'green' as const,
        type: 'add_words' as const,
      };
    }

    // PRIORITY 6: Established learners with good retention
    if (hasEstablishedVocabulary && hasHighRetention && !hasUpcomingLoad) {
      return {
        message: RECOMMENDATION_MESSAGES.ESTABLISHED_HIGH_RETENTION_NO_LOAD,
        indicator: 'green' as const,
        type: 'add_words' as const,
      };
    }

    // PRIORITY 7: High retention but upcoming review load
    if (hasHighRetention && hasUpcomingLoad) {
      return {
        message: RECOMMENDATION_MESSAGES.ESTABLISHED_HIGH_RETENTION_WITH_LOAD,
        indicator: 'orange' as const,
        type: 'balance' as const,
      };
    }

    // PRIORITY 8: Moderate retention scenarios
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

    // PRIORITY 9: Low retention or declining trend
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

    // Fallback: Check if user can safely add more words
    if (canSafelyAddWords && !hasDueWords) {
      return {
        message: RECOMMENDATION_MESSAGES.LIGHT_LEARNING_LOAD,
        indicator: 'green' as const,
        type: 'add_words' as const,
      };
    }

    // Default: Maintain momentum when no reviews are due
    return {
      message: RECOMMENDATION_MESSAGES.BALANCED_DEFAULT,
      indicator: 'green' as const,
      type: 'balance' as const,
    };
  }, [studyWords, dueWordsCount, currentRetention, learningWords, masteredWords, trend]);
}
