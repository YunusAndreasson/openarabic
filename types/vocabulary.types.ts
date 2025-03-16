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
  sentence_word: {
    word_form: string;
    english: string;
    sentence?: {
      arabic?: string;
      english?: string;
    };
  };
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  lapses: number;
  stability: number; // Memory stability - how well the item is remembered
  previous_interval: number; // The interval before the current one

  // Performance history tracking fields
  difficulty?: number; // Item-specific difficulty rating (0-1)
  success_streak?: number; // Count of consecutive successful reviews
  failure_streak?: number; // Count of consecutive failed reviews

  // Session-specific data
  sessionData?: {
    isNew?: boolean; // Is this a new word (review_count <= 1)
    failedInSession?: boolean; // Was this word failed in the current session
    consecutiveSuccesses?: number; // How many consecutive successes since last failure
    remainingReviewsNeeded?: number; // How many more reviews this word needs in the session
    processingAttempts?: number; // Attempts to process this word
    reinsertPosition?: number; // Position where this word should be reinserted in the queue
    practicedAfterFailure?: boolean; // Whether this word has been practiced at least once after failing
  };
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
  longestSuccessStreak: number;
  wordsWithStreaks: number;
  averageDifficulty: number;
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
  averageDifficulty: number;
  longestSuccessStreak: number;
  wordsWithStreaks: number;
}

/**
 * Props for the useSpacedRepetition hook
 */
export interface UseSpacedRepetitionProps {
  /** User ID for fetching vocabulary words */
  userId: string | undefined;
  /** Callback function that will be called when the review session is completed */
  onComplete?: () => void;
}

/**
 * Return type for the useSpacedRepetition hook
 */
export interface UseSpacedRepetitionReturn {
  /** Array of words due for review */
  dueWords: StudyWord[];
  /** Current position in the review queue */
  currentIndex: number;
  /** The word currently being reviewed */
  currentWord: StudyWord | undefined;
  /** Whether words are currently being loaded */
  isLoading: boolean;
  /** Function to update a word's review status (success/failure) */
  updateWord: (wordId: string, success: boolean) => Promise<void>;
  /** Current progress through the review session (0-100) */
  progress: number;
  /** Whether the review session is complete */
  isComplete: boolean;
  /** Function to invalidate cached queries and refresh data */
  invalidateQueries: () => void;
  /** Animation type for word transitions */
  transitionType: 'fade' | 'slide';
  /** Function to get statistics about the spaced repetition system */
  getSrsStats: () => SrsStats;
}
