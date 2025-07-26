import type { Tables } from './database.types';

/**
 * Enhanced sentence word type with root and word type information
 * Used in article views, word details, and vocabulary components
 */
export interface SentenceWord extends Tables<'sentence_words'> {
  root: Tables<'roots'> | null;
  word_type: Tables<'word_types'> | null;
  sentence?: Tables<'article_sentences'> | null;
  audio_start: string | null;
  audio_end: string | null;
}

/**
 * Extended StudyWord type that combines database fields with runtime session data
 * Used across vocabulary-related components, screens, and the spaced repetition system
 */
export interface StudyWord {
  root_id: number;
  root?: Tables<'roots'> | null;
  user_id: string;

  difficulty?: number;

  fsrs_due: string | null;
  fsrs_stability: number | null;
  fsrs_difficulty: number | null;
  fsrs_elapsed_days: number | null;
  fsrs_scheduled_days: number | null;
  fsrs_learning_steps: number | null;
  fsrs_reps: number | null;
  fsrs_lapses: number | null;
  fsrs_state: number | null;
  fsrs_last_review: string | null;

  created_at: string;
  success_streak?: number;
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
