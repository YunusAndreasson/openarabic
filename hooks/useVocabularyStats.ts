import { useMemo } from 'react';

import type { StudyWord, VocabularyStats, WeeklyProgressData } from '../types/vocabulary.types';
import { calculateWeeklyProgressData } from '../utils/vocabularyStats';

// Split stats calculation into smaller chunks for better memoization
const getBaseStats = (validStudyWords: StudyWord[], dueWordsData: StudyWord[]) => {
  const stats = validStudyWords.reduce(
    (acc, word) => {
      // Count new words
      if (!word.fsrs_last_review) {
        acc.newWordsCount++;
      }
      return acc;
    },
    {
      totalWords: validStudyWords.length,
      dueWords: dueWordsData?.length ?? 0,
      newWordsCount: 0,
    }
  );
  return stats;
};

const getAdvancedStats = (validStudyWords: StudyWord[]) => {
  if (validStudyWords.length === 0) return null;

  // Single pass for all stats
  const stats = validStudyWords.reduce(
    (acc, word) => {
      // Track reviewed words stats
      if (word.fsrs_last_review) {
        acc.reviewedCount++;
        // Calculate success_rate from success_streak if available
        const successRate = word.success_streak ? word.success_streak / (word.fsrs_reps || 1) : 0;
        acc.successRateSum += successRate;
        acc.intervalSum += word.interval_days || 0;
        acc.easeFactorSum += word.ease_factor || 0;
      }

      // Track mastery stats - CORRECTED FSRS state logic based on actual database analysis
      // FSRS State definitions (verified from database):
      // 0 = New (never reviewed)
      // 1 = Learning (in learning phase)
      // 2 = Review (graduated to review) - MASTERED when stability >= 5 days
      // 3 = Relearning (failed and relearning) - NOT mastered, back to learning
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      const hasReview = !!word.fsrs_last_review;

      // Mastered: Review state (2) with good stability (>=5) and actual review history
      if (state === 2 && stability >= 5 && hasReview) {
        acc.masteredCount++;
      } else {
        // Learning: All other states including:
        // - New (0)
        // - Learning (1)
        // - Review with low stability (2 but stability < 5)
        // - Relearning (3) - failed words back to learning
        acc.learningCount++;
      }

      // Track streaks and difficulty
      acc.maxStreak = Math.max(acc.maxStreak, word.success_streak || 0);
      acc.maxLongestStreak = Math.max(acc.maxLongestStreak, word.success_streak || 0);
      if ((word.success_streak || 0) > 0) acc.streakCount++;

      // Track other stats
      acc.lapsesSum += word.fsrs_lapses || 0;
      if (word.sessionData?.failedInSession) acc.failedInSession++;
      acc.difficultySum += word.fsrs_difficulty || 0.3;

      return acc;
    },
    {
      reviewedCount: 0,
      successRateSum: 0,
      intervalSum: 0,
      easeFactorSum: 0,
      masteredCount: 0,
      learningCount: 0,
      maxStreak: 0,
      maxLongestStreak: 0,
      streakCount: 0,
      lapsesSum: 0,
      failedInSession: 0,
      difficultySum: 0,
    }
  );

  const totalCount = validStudyWords.length || 1;
  const reviewedCount = stats.reviewedCount || 1;

  return {
    successRate: stats.successRateSum / reviewedCount,
    averageInterval: stats.intervalSum / reviewedCount,
    averageEaseFactor: stats.easeFactorSum / reviewedCount,
    masteredWords: stats.masteredCount,
    learningWords: stats.learningCount,
    streak: stats.maxStreak,
    longestSuccessStreak: stats.maxLongestStreak,
    wordsWithStreaks: stats.streakCount,
    averageLapses: stats.lapsesSum / totalCount,
    failedInSessionCount: stats.failedInSession,
    averageDifficulty: stats.difficultySum / totalCount,
  };
};

export function useVocabularyStats(
  studyWords: StudyWord[],
  dueWordsData: StudyWord[]
): {
  stats: VocabularyStats;
  weeklyProgressData: WeeklyProgressData[];
  validStudyWords: StudyWord[];
} {
  // Filter valid study words with error protection
  const validStudyWords = useMemo(() => {
    if (!Array.isArray(studyWords)) return [] as StudyWord[];
    return studyWords.filter(word => word != null && word.root_id != null);
  }, [studyWords]);

  // Split stats calculation into smaller memoized chunks - optimized with calculation key
  const baseStats = useMemo(() => {
    if (validStudyWords?.length === 0 && studyWords?.length === 0) {
      return {
        totalWords: 0,
        dueWords: dueWordsData?.length ?? 0,
        newWordsCount: 0,
      };
    }
    return getBaseStats(validStudyWords ?? [], dueWordsData ?? []);
  }, [dueWordsData, studyWords?.length, validStudyWords]); // Only recalculate when key changes

  const advancedStats = useMemo(() => {
    if (validStudyWords?.length === 0) return null;
    return getAdvancedStats(validStudyWords);
  }, [validStudyWords]); // Only recalculate when key changes

  // Combine stats with safe defaults
  const stats = useMemo<VocabularyStats>(
    () => ({
      totalWords: baseStats.totalWords || 0,
      dueWords: baseStats.dueWords || 0,
      newWordsCount: baseStats.newWordsCount || 0,
      masteredWords: advancedStats?.masteredWords || 0,
      learningWords: advancedStats?.learningWords || 0,
      streak: advancedStats?.streak || 0,
      successRate: advancedStats?.successRate || 0,
      averageInterval: advancedStats?.averageInterval || 0,
      averageEaseFactor: advancedStats?.averageEaseFactor || 0,
      averageLapses: advancedStats?.averageLapses || 0,
      failedInSessionCount: advancedStats?.failedInSessionCount || 0,
      longestSuccessStreak: advancedStats?.longestSuccessStreak || 0,
      wordsWithStreaks: advancedStats?.wordsWithStreaks || 0,
      averageDifficulty: advancedStats?.averageDifficulty || 0.3,
    }),
    [baseStats, advancedStats]
  );

  // Calculate weekly progress data with memoization
  const weeklyProgressData = useMemo<WeeklyProgressData[]>(() => {
    return calculateWeeklyProgressData(validStudyWords);
  }, [validStudyWords]);

  return {
    stats,
    weeklyProgressData,
    validStudyWords,
  };
}
