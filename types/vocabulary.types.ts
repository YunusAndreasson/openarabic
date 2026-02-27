import type { RootId, UserId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';

/**
 * Pre-computed color segment for Arabic word rendering
 */
export interface ColoredSegment {
  text: string;
  color: string;
  type: 'prefix' | 'infix' | 'suffix' | 'diacritic' | 'root';
}

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
  /** Pre-computed colored segments for performance (computed once at load time) */
  coloredSegments?: ColoredSegment[];
}

/**
 * Extended StudyWord type that combines database fields with runtime session data
 * Used across vocabulary-related components, screens, and the spaced repetition system
 *
 * Extends Tables<'study_words'> to prevent type drift when database schema changes.
 * Only overrides IDs with branded types for type safety.
 */
export interface StudyWord extends Omit<Tables<'study_words'>, 'root_id' | 'user_id'> {
  /** Root ID (branded for type safety) */
  root_id: RootId;
  /** User ID (branded for type safety) */
  user_id: UserId;
  /** Optional root relation loaded from database */
  root?: Tables<'roots'> | null;
}
