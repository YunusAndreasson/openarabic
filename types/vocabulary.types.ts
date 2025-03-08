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
  sentence_word_id: string;
  sentence_word: Partial<SentenceWord> & {
    word_form: string;
    english: string;
    sentence?: {
      arabic: string;
    };
  };
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  lapses: number;
  stability: number; // Memory stability - how well the item is remembered
  previous_interval: number; // The interval before the current one
  // Session-specific properties (not stored in database)
  sessionData?: {
    isNew?: boolean; // Is this a new word (review_count <= 1)
    failedInSession?: boolean; // Was this word failed in the current session
    consecutiveSuccesses?: number; // How many consecutive successes since last failure
    remainingReviewsNeeded?: number; // How many more reviews this word needs in the session
    processingAttempts?: number; // Attempts to process this word
  };
  reinsertPosition?: number; // Position where this word should be reinserted in the queue
}

/**
 * Statistics used by vocabulary dashboard, graphs, and components
 */
export interface VocabularyStats {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
  streak: number;
  successRate: number;
  averageInterval: number;
  averageEaseFactor: number;
  averageLapses: number;
  newWordsCount: number;
  failedInSessionCount: number;
}

/**
 * Weekly progress data for vocabulary charts
 * Each entry represents one day's worth of data
 */
export interface WeeklyProgressData {
  date: string; // Format: "Mon", "Tue", etc.
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
}

/**
 * Props for the useSpacedRepetition hook
 */
export interface UseSpacedRepetitionProps {
  userId: string | undefined;
  onComplete?: () => void;
}

/**
 * Return type for the useSpacedRepetition hook
 */
export interface UseSpacedRepetitionReturn {
  dueWords: StudyWord[];
  currentIndex: number;
  currentWord: StudyWord | undefined;
  isLoading: boolean;
  isUpdating: boolean;
  updateWord: (wordId: string, success: boolean) => Promise<void>;
  progress: number;
  isComplete: boolean;
  invalidateQueries: () => void;
  transitionType: 'fade' | 'slide';
  getSrsStats: () => SrsStats;
}
