import type { RootId } from '@/types/branded.types';
import type { WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * FSRS-specific update fields for study word review
 * Matches the database schema for study_words table
 */
export interface FSRSWordUpdate {
  fsrs_due: string;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_learning_steps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_last_review: string;
}

/**
 * Options for fetching FSRS words from the database
 */
export interface GetFSRSWordsOptions {
  onlyDue?: boolean;
  forStats?: boolean;
  limit?: number;
  sortByDifficultyAndStability?: boolean;
  reviewedOnly?: boolean;
  /**
   * Session cooldown: Exclude words reviewed within this many hours.
   * Useful to prevent words from appearing immediately after a study session.
   * Default: 0 (no cooldown), common values: 1-24 hours
   */
  sessionCooldownHours?: number;
  /**
   * Server-side filter for vocabulary category.
   * - "mastered": fsrs_state = 2 (Review) and fsrs_stability >= 5
   * - "learning": fsrs_state in (0,1,3) or (fsrs_state = 2 and fsrs_stability < 5)
   */
  category?: 'learning' | 'mastered';
}

export interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
  /**
   * Session cooldown: Exclude words reviewed within this many hours.
   * Prevents words from appearing immediately after a study session.
   * Default: 1 hour
   */
  sessionCooldownHours?: number;
}

export interface UseFSRSResult {
  currentWord: StudyWord | null;
  wordQueue: StudyWord[];
  isLoading: boolean;
  isComplete: boolean;
  progress: number;
  updateWord: (rootId: RootId, confidence: WordConfidence) => Promise<number | undefined>;
  invalidateQueries: () => void;
  resetQueue: () => void;
}

export interface FSRSStateTracking {
  isProcessingUpdate: boolean;
  completionTriggered: boolean;
  queueInitialized: boolean;
}
