import type { Tables } from './database.types';

/**
 * Enhanced sentence word type with root and word type information
 * Used in article views, word details, and vocabulary components
 */
export interface SentenceWord extends Tables<'sentence_words'> {
  root: Tables<'roots'> | null;
  word_type: Tables<'word_types'> | null;
}

/**
 * Extended StudyWord type that combines database fields with runtime session data
 * Used across vocabulary-related components, screens, and the spaced repetition system
 */
export interface StudyWord {
  sentence_word_id: number;
  user_id: string;
  sentence_word: SentenceWord;

  // Legacy fields (kept for compatibility)
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  stability: number;
  lapses: number;
  previous_interval: number;

  // FSRS fields
  fsrs_due: string;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_elapsed_days: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_last_review: string | null;

  // Additional fields
  created_at: string;
  success_streak?: number;
  failure_streak?: number;
  difficulty?: number;

  // Session data
  sessionData?: {
    isNew?: boolean; // Is this a new word (review_count <= 1)
    failedInSession?: boolean; // Has the user failed this word in the current session
  };
}

/**
 * Statistics used by vocabulary dashboard, graphs, and components
 */
export interface VocabularyStats {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  dueWords: number;
  streak: number;
  successRate: number;
  averageInterval: number;
  averageEaseFactor: number;
  averageLapses: number;
  newWordsCount: number;
  failedInSessionCount: number;
  longestSuccessStreak: number;
  wordsWithStreaks: number;
  averageDifficulty: number;
}

/**
 * Weekly progress data for vocabulary charts
 * Each entry represents one day's worth of data
 */
export interface WeeklyProgressData {
  date: string; // Day abbreviation (e.g., 'Mon', 'Tue')
  count: number;
  wordsLearned: number;
}

/**
 * Processed point with coordinates for graph visualization
 */
export interface GraphProcessedPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

/**
 * Processed graph data with paths and statistics
 */
export interface GraphPaths {
  points: GraphProcessedPoint[];
  areaPath: string;
  linePath: string;
  totalWordsLearned: number;
  dailyAverage: number;
  maxValue: number;
}

/**
 * Statistics about the spaced repetition system
 * Used by vocabulary dashboard components and screens
 */
export interface SrsStats {
  totalWords: number;
  averageInterval: number;
  averageStability: number;
  averageEaseFactor: number;
  successRate: number;
  masteredCount: number;
  learningCount: number;
  averageLapses: number;
  failedWordsRemaining: number;
  newWordsCount: number;
  failedInSessionCount: number;
  averageDifficulty: number;
  longestSuccessStreak: number;
  wordsWithStreaks: number;
}
