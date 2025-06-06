import { useMemo } from 'react';

import { useFSRSQueries } from './useFSRSQueries';
import { useVocabularyChartData } from './useVocabularyChartData';

export interface UserProfile {
  level: {
    title: string;
    subtitle: string;
    color: string;
    icon: string;
  };
  journey: {
    stage: string;
    description: string;
    progress: number; // 0-100
  };
  achievements: {
    icon: string;
    text: string;
    color: string;
  }[];
  stats: {
    daysActive: number;
    wordsLearned: number;
    currentStreak: number;
    efficiency: number; // 0-100
  };
}

/**
 * Hook to calculate user learning profile based on FSRS data and learning patterns
 */
export function useUserProfile(userId?: string): UserProfile {
  const { userStats } = useVocabularyChartData(userId);
  // TODO: Implement streak tracking when needed
  const currentStreak = 0;
  const longestStreak = 0;
  const { allWords } = useFSRSQueries({ userId });

  return useMemo(() => {
    // Default profile for new users
    const defaultProfile: UserProfile = {
      level: {
        title: 'Explorer',
        subtitle: 'Beginning your Arabic journey',
        color: '#6B7280',
        icon: 'compass',
      },
      journey: {
        stage: 'Getting Started',
        description: 'Building your foundation',
        progress: 0,
      },
      achievements: [],
      stats: {
        daysActive: 0,
        wordsLearned: 0,
        currentStreak: 0,
        efficiency: 0,
      },
    };

    if (!userStats || !allWords) {
      return defaultProfile;
    }

    const totalWords = userStats.totalWords || 0;
    const masteredWords = userStats.masteredWords || 0;
    const learningWords = userStats.learningWords || 0;

    // Calculate learning efficiency based on FSRS data
    const efficiency = calculateLearningEfficiency(allWords);

    // Calculate days active (approximate based on review data)
    const daysActive = calculateDaysActive(allWords);

    // Determine user level based on mastered words and consistency
    const level = determineUserLevel(masteredWords, currentStreak, longestStreak, efficiency);

    // Determine journey stage and progress
    const journey = determineJourneyStage(totalWords, masteredWords, learningWords);

    // Calculate achievements
    const achievements = calculateAchievements(
      masteredWords,
      currentStreak,
      longestStreak,
      efficiency
    );

    return {
      level,
      journey,
      achievements,
      stats: {
        daysActive,
        wordsLearned: totalWords,
        currentStreak,
        efficiency,
      },
    };
  }, [userStats, allWords, currentStreak, longestStreak]);
}

function calculateLearningEfficiency(words: any[]): number {
  if (!words.length) return 0;

  const reviewedWords = words.filter(w => w.fsrs_reps && w.fsrs_reps > 0);
  if (!reviewedWords.length) return 0;

  // Calculate efficiency based on success rate and stability gains
  const totalEfficiency = reviewedWords.reduce((sum, word) => {
    const reps = word.fsrs_reps || 1;
    const lapses = word.fsrs_lapses || 0;
    const stability = word.fsrs_stability || 0;

    // Success rate component (0-50 points)
    const successRate = Math.max(0, (reps - lapses) / reps);
    const successPoints = successRate * 50;

    // Stability component (0-50 points)
    const stabilityPoints = Math.min(50, stability * 2);

    return sum + successPoints + stabilityPoints;
  }, 0);

  return Math.round(totalEfficiency / reviewedWords.length);
}

function calculateDaysActive(words: any[]): number {
  if (!words.length) return 0;

  const reviewDates = words
    .filter(w => w.fsrs_last_review)
    .map(w => new Date(w.fsrs_last_review).toDateString());

  return new Set(reviewDates).size;
}

function determineUserLevel(
  masteredWords: number,
  currentStreak: number,
  longestStreak: number,
  efficiency: number
): UserProfile['level'] {
  // Novice: 0-25 mastered words
  if (masteredWords < 25) {
    return {
      title: 'Explorer',
      subtitle: 'Beginning your Arabic journey',
      color: '#6B7280',
      icon: 'compass',
    };
  }

  // Learner: 25-100 mastered words
  if (masteredWords < 100) {
    return {
      title: 'Learner',
      subtitle: 'Building vocabulary foundations',
      color: '#3B82F6',
      icon: 'book',
    };
  }

  // Student: 100-300 mastered words
  if (masteredWords < 300) {
    return {
      title: 'Student',
      subtitle: 'Developing language skills',
      color: '#8B5CF6',
      icon: 'school',
    };
  }

  // Scholar: 300-600 mastered words with good consistency
  if (masteredWords < 600) {
    if (longestStreak >= 7 && efficiency >= 70) {
      return {
        title: 'Scholar',
        subtitle: 'Dedicated language student',
        color: '#F59E0B',
        icon: 'library',
      };
    }
    return {
      title: 'Student',
      subtitle: 'Developing language skills',
      color: '#8B5CF6',
      icon: 'school',
    };
  }

  // Expert: 600+ mastered words with excellent consistency
  if (longestStreak >= 14 && efficiency >= 80) {
    return {
      title: 'Expert',
      subtitle: 'Advanced Arabic practitioner',
      color: '#10B981',
      icon: 'trophy',
    };
  }

  // Advanced: 600+ mastered words
  return {
    title: 'Advanced',
    subtitle: 'Skilled Arabic learner',
    color: '#059669',
    icon: 'star',
  };
}

function determineJourneyStage(
  totalWords: number,
  masteredWords: number,
  learningWords: number
): UserProfile['journey'] {
  if (totalWords === 0) {
    return {
      stage: 'Getting Started',
      description: 'Ready to begin learning',
      progress: 0,
    };
  }

  if (totalWords < 50) {
    return {
      stage: 'Foundation Building',
      description: 'Learning your first words',
      progress: Math.round((totalWords / 50) * 100),
    };
  }

  if (masteredWords < 100) {
    return {
      stage: 'Vocabulary Growth',
      description: 'Expanding your word knowledge',
      progress: Math.round((masteredWords / 100) * 100),
    };
  }

  if (masteredWords < 300) {
    return {
      stage: 'Skill Development',
      description: 'Building language confidence',
      progress: Math.round(((masteredWords - 100) / 200) * 100),
    };
  }

  if (masteredWords < 600) {
    return {
      stage: 'Advanced Learning',
      description: 'Mastering complex vocabulary',
      progress: Math.round(((masteredWords - 300) / 300) * 100),
    };
  }

  return {
    stage: 'Language Mastery',
    description: 'Achieving fluency goals',
    progress: Math.min(100, Math.round(((masteredWords - 600) / 400) * 100)),
  };
}

function calculateAchievements(
  masteredWords: number,
  currentStreak: number,
  longestStreak: number,
  efficiency: number
): UserProfile['achievements'] {
  const achievements: UserProfile['achievements'] = [];

  // Streak achievements
  if (currentStreak >= 7) {
    achievements.push({
      icon: 'flame',
      text: `${currentStreak}-day streak`,
      color: '#F59E0B',
    });
  } else if (longestStreak >= 7) {
    achievements.push({
      icon: 'flash',
      text: `${longestStreak}-day best`,
      color: '#6B7280',
    });
  }

  // Mastery achievements
  if (masteredWords >= 500) {
    achievements.push({
      icon: 'star',
      text: 'Vocabulary Master',
      color: '#10B981',
    });
  } else if (masteredWords >= 100) {
    achievements.push({
      icon: 'checkmark-circle',
      text: 'Century Club',
      color: '#3B82F6',
    });
  }

  // Efficiency achievements
  if (efficiency >= 85) {
    achievements.push({
      icon: 'trending-up',
      text: 'High Efficiency',
      color: '#059669',
    });
  }

  // If no major achievements, show encouraging milestone
  if (achievements.length === 0) {
    if (masteredWords >= 25) {
      achievements.push({
        icon: 'leaf',
        text: 'Growing Strong',
        color: '#10B981',
      });
    } else if (masteredWords >= 10) {
      achievements.push({
        icon: 'seedling',
        text: 'First Steps',
        color: '#6B7280',
      });
    }
  }

  return achievements.slice(0, 2); // Max 2 achievements for clean design
}
