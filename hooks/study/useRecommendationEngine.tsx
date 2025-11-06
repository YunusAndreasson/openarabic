import type { ReactNode } from 'react';
import React, { useMemo } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { BoldText } from '@/components/ui/BoldText';
import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { calculateNextDueDate, getForecastSummary } from '@/utils/fsrsUtils';

export interface RecommendationData {
  message: ReactNode; // Changed from string to support React elements with bold formatting
  indicator: 'green' | 'orange' | 'red';
  type: 'add_words' | 'review_focus' | 'balance' | 'getting_started';
  metrics: {
    // Expose metrics for debugging and testing
    retention: number;
    dueCount: number;
    masteredCount: number;
    upcomingDue: number;
  };
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
    currentRetention < MEMORY_CAPACITY_THRESHOLDS.GOOD; // Fixed: was < MODERATE (70), now < GOOD (75)
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
  trend: 'improving' | 'declining' | 'stable',
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
  masteredWords: number,
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

// Message generator parameter interface for data-rich coaching messages
interface MessageGeneratorParams {
  dueWordsCount: number;
  currentRetention: number;
  masteredWords: number;
  currentStreak?: number; // Optional: pass from parent
  upcomingDueWords: number;
  nextDueDate: Date | null;
  learningWords: number;
  totalWords: number;
  trend: 'improving' | 'declining' | 'stable';
  studyWords: StudyWord[]; // Added for lazy forecast calculation
}

// Helper function to format days until next due date
function formatDaysUntilDue(nextDueDate: Date | null): string | null {
  if (!nextDueDate) return null;
  const daysUntil = Math.ceil((nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return `in ${daysUntil} days`;
}

// Helper function for pluralization
function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}

// Data-rich message generator functions with bold formatting
// All messages use ThemedText for consistent styling (caption type, secondaryText color)
const RECOMMENDATION_MESSAGES = {
  GETTING_STARTED: (_params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Start building your vocabulary by adding words from articles you read.
    </ThemedText>
  ),

  // Due words priority messages
  DUE_WORDS_MANY_LOW_RETENTION: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      <BoldText>
        {params.dueWordsCount} {pluralize(params.dueWordsCount, 'word')}
      </BoldText>{' '}
      are due for review and your memory strength is <BoldText>{params.currentRetention}%</BoldText>
      . Focus on completing your practice sessions to rebuild your memory foundation.
    </ThemedText>
  ),
  DUE_WORDS_MANY: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      You have{' '}
      <BoldText>
        {params.dueWordsCount} {pluralize(params.dueWordsCount, 'word')}
      </BoldText>{' '}
      waiting for review. Complete your practice sessions to maintain optimal spacing intervals.
    </ThemedText>
  ),
  DUE_WORDS_SINGLE: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      You have{' '}
      <BoldText>
        {params.dueWordsCount} {pluralize(params.dueWordsCount, 'word')}
      </BoldText>{' '}
      due for review. Keep up with your practice sessions to maintain effective spaced repetition.
    </ThemedText>
  ),

  // Absolute beginner messages (0 words)
  ABSOLUTE_BEGINNER_READY: (_params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Welcome! Start by adding <BoldText>10-15 words</BoldText> from articles you read to begin
      building your Arabic vocabulary foundation.
    </ThemedText>
  ),

  // Early learner messages (1-25 words) - more encouraging
  EARLY_LEARNER_CAN_ADD: (params: MessageGeneratorParams) => {
    const dueInfo = formatDaysUntilDue(params.nextDueDate);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        Great progress with{' '}
        <BoldText>
          {params.totalWords} {pluralize(params.totalWords, 'word')}
        </BoldText>
        ! You have a solid start.
        {dueInfo && (
          <>
            {' '}
            Your next review is <BoldText>{dueInfo}</BoldText>.
          </>
        )}{' '}
        Keep adding words from articles to accelerate your learning.
      </ThemedText>
    );
  },
  EARLY_LEARNER_REVIEW_FIRST: (params: MessageGeneratorParams) => {
    const dueInfo = formatDaysUntilDue(params.nextDueDate);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        Great work! Your words will become due{' '}
        {dueInfo ? <BoldText>{dueInfo}</BoldText> : 'soon'}. In the meantime, explore articles to
        find vocabulary you'd like to add next.
      </ThemedText>
    );
  },

  // Building foundation messages (26-50 words) - balanced approach
  BUILDING_FOUNDATION_CAN_ADD: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      You're building a strong foundation with{' '}
      <BoldText>
        {params.totalWords} {pluralize(params.totalWords, 'word')}
      </BoldText>
      ! Continue adding new words from articles to accelerate your progress.
    </ThemedText>
  ),
  BUILDING_FOUNDATION_CONSOLIDATE: (params: MessageGeneratorParams) => {
    const dueInfo = formatDaysUntilDue(params.nextDueDate);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        You're in a consolidation phase. Your current words will become due{' '}
        {dueInfo ? <BoldText>{dueInfo}</BoldText> : 'soon'}—stay consistent and explore articles
        for vocabulary to add next.
      </ThemedText>
    );
  },
  BUILDING_FOUNDATION_OPTIMAL: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Perfect! You're in an optimal vocabulary range with{' '}
      <BoldText>
        {params.totalWords} {pluralize(params.totalWords, 'word')}
      </BoldText>{' '}
      and <BoldText>{params.currentRetention}% memory strength</BoldText>. Continue exploring
      articles and adding words gradually to maximize your learning efficiency.
    </ThemedText>
  ),

  // Learning phase messages - more nuanced
  LIGHT_LEARNING_LOAD: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Your learning load is light with{' '}
      <BoldText>
        {params.learningWords} {pluralize(params.learningWords, 'word')} in progress
      </BoldText>
      . This is a great time to add new vocabulary from articles you find interesting.
    </ThemedText>
  ),
  MODERATE_LEARNING_LOAD: (params: MessageGeneratorParams) => {
    const dueInfo = formatDaysUntilDue(params.nextDueDate);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        Your words are consolidating.{' '}
        <BoldText>
          {params.learningWords} {pluralize(params.learningWords, 'word')}
        </BoldText>{' '}
        are building strength
        {dueInfo && (
          <>
            {' '}
            and will become due <BoldText>{dueInfo}</BoldText>
          </>
        )}
        . Stay consistent!
      </ThemedText>
    );
  },
  HEAVY_LEARNING_LOAD: (params: MessageGeneratorParams) => {
    const dueInfo = formatDaysUntilDue(params.nextDueDate);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        You're in a heavy consolidation phase with{' '}
        <BoldText>
          {params.learningWords} active {pluralize(params.learningWords, 'word')}
        </BoldText>
        . Words will become due <BoldText>{dueInfo || 'soon'}</BoldText>—stay ready!
      </ThemedText>
    );
  },

  // Established learner messages
  ESTABLISHED_HIGH_RETENTION_NO_LOAD: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Excellent <BoldText>{params.currentRetention}% retention</BoldText> with{' '}
      <BoldText>
        {params.masteredWords} {pluralize(params.masteredWords, 'word')} mastered
      </BoldText>
      ! This is a great opportunity to expand your vocabulary by exploring articles and adding new
      words.
    </ThemedText>
  ),
  ESTABLISHED_HIGH_RETENTION_WITH_LOAD: (params: MessageGeneratorParams) => {
    // Lazy calculation: only compute expensive forecast when this message is shown
    const forecastSummary = getForecastSummary(params.studyWords);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        Your retention is strong at <BoldText>{params.currentRetention}%</BoldText>. Stay
        consistent with practice sessions—up to{' '}
        <BoldText>
          {forecastSummary.totalDueNext7Days} {pluralize(forecastSummary.totalDueNext7Days, 'word')}
        </BoldText>{' '}
        may be due on your busiest day this week.
      </ThemedText>
    );
  },

  // Moderate retention messages
  MODERATE_GOOD_PROGRESS: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Great progress! Your <BoldText>{params.currentRetention}% memory strength</BoldText> is solid.
      Stay consistent as you continue building your vocabulary—your retention will improve with
      regular practice.
    </ThemedText>
  ),
  MODERATE_NEEDS_ATTENTION: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Practice sessions are key to improving your{' '}
      <BoldText>{params.currentRetention}% retention</BoldText>. Consistent practice will help FSRS
      optimize your learning intervals for better results.
    </ThemedText>
  ),

  // Low retention messages
  LOW_RETENTION: (params: MessageGeneratorParams) => (
    <ThemedText type="caption" colorName="secondaryText">
      Your <BoldText>{params.currentRetention}% retention</BoldText> needs attention. Prioritize
      completing all review sessions to help FSRS recalculate optimal intervals.
    </ThemedText>
  ),

  // Default messages - focus on consistent habits and exploration
  BALANCED_ESTABLISHED: (params: MessageGeneratorParams) => {
    const dueInfo = formatDaysUntilDue(params.nextDueDate);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        Great progress with{' '}
        <BoldText>
          {params.masteredWords} {pluralize(params.masteredWords, 'word')} mastered
        </BoldText>
        ! Stay consistent with your learning habits. When words become due{' '}
        {dueInfo && (
          <>
            <BoldText>{dueInfo}</BoldText>
          </>
        )}
        , practice them promptly to maintain optimal spacing.
      </ThemedText>
    );
  },
  BALANCED_DEFAULT: (params: MessageGeneratorParams) => {
    const dueInfo = formatDaysUntilDue(params.nextDueDate);
    return (
      <ThemedText type="caption" colorName="secondaryText">
        Keep up the momentum with{' '}
        <BoldText>
          {params.totalWords} {pluralize(params.totalWords, 'word')}
        </BoldText>
        ! Continue exploring articles and when words become due {dueInfo && <BoldText>{dueInfo}</BoldText>}
        , practice them promptly to maintain your progress.
      </ThemedText>
    );
  },
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
      trend,
    );
    const learningState: LearningState = getLearningState(totalWords, learningWords, masteredWords);

    // Calculate prognosis data for data-rich messages (forecastSummary calculated lazily when needed)
    const nextDueDate = calculateNextDueDate(studyWords);

    // Create message generator params object
    const messageParams: MessageGeneratorParams = {
      dueWordsCount,
      currentRetention: Math.round(currentRetention),
      masteredWords,
      upcomingDueWords,
      nextDueDate,
      learningWords,
      totalWords,
      trend,
      studyWords, // Pass for lazy forecast calculation
    };

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

    // Helper function to create return object with metrics
    const createRecommendation = (
      message: ReactNode,
      indicator: 'green' | 'orange' | 'red',
      type: 'add_words' | 'review_focus' | 'balance' | 'getting_started',
    ): RecommendationData => ({
      message,
      indicator,
      type,
      metrics: {
        retention: messageParams.currentRetention,
        dueCount: messageParams.dueWordsCount,
        masteredCount: messageParams.masteredWords,
        upcomingDue: messageParams.upcomingDueWords,
      },
    });

    // Generate recommendation based on vocabulary progression and spaced repetition principles

    // PRIORITY 1: Any due words require immediate attention (spaced repetition principle)
    if (hasDueWords) {
      if (hasManyDueWords && hasLowRetention) {
        return createRecommendation(
          RECOMMENDATION_MESSAGES.DUE_WORDS_MANY_LOW_RETENTION(messageParams),
          'red',
          'review_focus',
        );
      }

      if (hasManyDueWords) {
        return createRecommendation(
          RECOMMENDATION_MESSAGES.DUE_WORDS_MANY(messageParams),
          'orange',
          'review_focus',
        );
      }

      return createRecommendation(
        RECOMMENDATION_MESSAGES.DUE_WORDS_SINGLE(messageParams),
        'orange',
        'review_focus',
      );
    }

    // PRIORITY 2: Absolute beginner (0 words) - special case
    if (vocabularyStage === 'absolute_beginner') {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.ABSOLUTE_BEGINNER_READY(messageParams),
        'green',
        'add_words',
      );
    }

    // PRIORITY 3: Early learner stage (1-25 words) - be encouraging and focus on growth
    if (vocabularyStage === 'early_learner') {
      if (canSafelyAddWords) {
        return createRecommendation(
          RECOMMENDATION_MESSAGES.EARLY_LEARNER_CAN_ADD(messageParams),
          'green',
          'add_words',
        );
      }

      return createRecommendation(
        RECOMMENDATION_MESSAGES.EARLY_LEARNER_REVIEW_FIRST(messageParams),
        'orange',
        'review_focus',
      );
    }

    // PRIORITY 4: Building foundation stage (26-50 words) - balance adding and consolidating
    if (vocabularyStage === 'building_foundation') {
      if (isInOptimalRange) {
        return createRecommendation(
          RECOMMENDATION_MESSAGES.BUILDING_FOUNDATION_OPTIMAL(messageParams),
          'green',
          'balance',
        );
      }

      if (canSafelyAddWords) {
        return createRecommendation(
          RECOMMENDATION_MESSAGES.BUILDING_FOUNDATION_CAN_ADD(messageParams),
          'green',
          'add_words',
        );
      }

      return createRecommendation(
        RECOMMENDATION_MESSAGES.BUILDING_FOUNDATION_CONSOLIDATE(messageParams),
        'orange',
        'review_focus',
      );
    }

    // PRIORITY 5: Learning load based recommendations (all stages)
    if (learningLoadLevel === 'heavy' || isInHeavyLearningPhase) {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.HEAVY_LEARNING_LOAD(messageParams),
        'orange',
        'review_focus',
      );
    }

    if (learningLoadLevel === 'moderate') {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.MODERATE_LEARNING_LOAD(messageParams),
        'orange',
        'balance',
      );
    }

    if (learningLoadLevel === 'light' && canSafelyAddWords) {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.LIGHT_LEARNING_LOAD(messageParams),
        'green',
        'add_words',
      );
    }

    // PRIORITY 6: Established learners with good retention
    if (hasEstablishedVocabulary && hasHighRetention && !hasUpcomingLoad) {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.ESTABLISHED_HIGH_RETENTION_NO_LOAD(messageParams),
        'green',
        'add_words',
      );
    }

    // PRIORITY 7: High retention but upcoming review load
    if (hasHighRetention && hasUpcomingLoad) {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.ESTABLISHED_HIGH_RETENTION_WITH_LOAD(messageParams),
        'orange',
        'balance',
      );
    }

    // PRIORITY 8: Moderate retention scenarios
    if (hasModerateRetention) {
      if (learningProgressRatio > 0.5) {
        return createRecommendation(
          RECOMMENDATION_MESSAGES.MODERATE_GOOD_PROGRESS(messageParams),
          'green',
          'balance',
        );
      }

      return createRecommendation(
        RECOMMENDATION_MESSAGES.MODERATE_NEEDS_ATTENTION(messageParams),
        'orange',
        'review_focus',
      );
    }

    // PRIORITY 9: Low retention or declining trend
    if (hasLowRetention || isDeclining) {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.LOW_RETENTION(messageParams),
        'red',
        'review_focus',
      );
    }

    // DEFAULT: Balanced approach for established learners
    if (hasEstablishedVocabulary && learningProgressRatio > 0.6) {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.BALANCED_ESTABLISHED(messageParams),
        'green',
        'balance',
      );
    }

    // Fallback: Check if user can safely add more words
    if (canSafelyAddWords && !hasDueWords) {
      return createRecommendation(
        RECOMMENDATION_MESSAGES.LIGHT_LEARNING_LOAD(messageParams),
        'green',
        'add_words',
      );
    }

    // Default: Maintain momentum when no reviews are due
    return createRecommendation(
      RECOMMENDATION_MESSAGES.BALANCED_DEFAULT(messageParams),
      'green',
      'balance',
    );
  }, [studyWords, dueWordsCount, currentRetention, learningWords, masteredWords, trend]);
}
