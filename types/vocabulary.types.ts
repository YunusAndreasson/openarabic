import type { RootId, UserId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';

/**
 * Enhanced sentence word type with root and word type information
 * Used in article views, word details, and vocabulary components
 */
export interface SentenceWord extends Omit<Tables<'sentence_words'>, 'root_id'> {
  /** Root ID (branded for type safety) */
  root_id: RootId;
  root: Tables<'roots'> | null;
  word_type: Tables<'word_types'> | null;
  sentence?: Tables<'article_sentences'> | null;
}

/**
 * Extended StudyWord type that combines database fields with runtime session data
 * Used across vocabulary-related components, screens, and the spaced repetition system
 */
export interface StudyWord {
  /** Root ID (branded for type safety) */
  root_id: RootId;
  root?: Tables<'roots'> | null;
  /** User ID (branded for type safety) */
  user_id: UserId;

  fsrs_due: string | null;
  fsrs_stability: number | null;
  fsrs_difficulty: number | null;
  fsrs_elapsed_days: number | null;
  fsrs_scheduled_days: number | null;
  fsrs_learning_steps: number | null;
  fsrs_reps: number | null;
  fsrs_lapses: number | null;
  fsrs_state: number | null;
  fsrs_last_review: string; // Always exists - has default value of now()

  created_at: string;
}

/**
 * Category types for vocabulary statistics and filtering
 */
export type StatCategory =
  | 'difficultyEasy'
  | 'difficultyHard'
  | 'difficultyMedium'
  | 'due'
  | 'learning'
  | 'mastered'
  | 'needsAttention'
  | 'struggling'
  | 'total';
