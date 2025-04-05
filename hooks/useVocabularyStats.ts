import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { studyWordsFSRSService } from '../services/studyWordsFSRS';
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

      // Track mastery stats - use fsrs_state instead of 'state'
      if (word.fsrs_state === 3) acc.masteredCount++; // Assuming state 3 is 'mastered'
      if (word.fsrs_state === 1 || word.fsrs_state === 2) acc.learningCount++; // Assuming states 1-2 are 'learning'

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
  const userId = studyWords[0]?.user_id;

  // Fetch review logs for weekly progress
  const { data: reviewLogs = [] } = useQuery({
    queryKey: ['review-logs', userId],
    queryFn: () => (userId ? studyWordsFSRSService.getReviewLogs(userId) : Promise.resolve([])),
    enabled: !!userId,
  });

  // Filter valid study words with error protection
  const validStudyWords = useMemo(() => {
    if (!Array.isArray(studyWords)) return [] as StudyWord[];
    return studyWords.filter(word => word?.sentence_word != null);
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

  // Calculate weekly progress data with memoization using review logs
  const weeklyProgressData = useMemo<WeeklyProgressData[]>(() => {
    return calculateWeeklyProgressData(validStudyWords, reviewLogs);
  }, [validStudyWords, reviewLogs]);

  return {
    stats,
    weeklyProgressData,
    validStudyWords,
  };
}
