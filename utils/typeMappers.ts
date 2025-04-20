import type { Article, ArticleSentence } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { StudyWord, SentenceWord } from '@/types/vocabulary.types';

import { handleError } from './errorHandling';

type DatabaseRecord = Record<string, unknown>;

/**
 * Type for transform functions used in safeGet
 */
type TransformFn<T> = (val: unknown) => T;

/**
 * Safely maps values from a potentially unknown object shape
 * @param obj The object to safely extract values from
 * @param key The key to extract
 * @param defaultValue A default value to use if the key is missing or invalid
 * @param transform Optional transform function to apply to the value
 */
function safeGet<T>(
  obj: DatabaseRecord,
  key: string,
  defaultValue: T,
  transform?: TransformFn<T>
): T {
  const value = obj[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (transform) {
    try {
      return transform(value);
    } catch (e) {
      handleError(e instanceof Error ? e : new Error('Transform error'));
      return defaultValue;
    }
  }
  return value as T;
}

/**
 * Maps a database query result to a properly typed StudyWord object
 * @param item Database row from study_words table with related data
 * @returns A fully typed StudyWord object with all required fields
 */
export function mapToStudyWord(item: DatabaseRecord): StudyWord {
  return {
    sentence_word_id: safeGet(item, 'sentence_word_id', null),
    sentence_word: safeGet(item, 'sentence_word', undefined),
    root_id: safeGet(item, 'root_id', 0, Number),
    root: safeGet(item, 'root', undefined),
    user_id: safeGet(item, 'user_id', '', String),

    // Legacy fields
    interval_days: safeGet(item, 'interval_days', 0, Number),
    ease_factor: safeGet(item, 'ease_factor', 2.5, Number),
    next_review_at: safeGet(item, 'next_review_at', new Date().toISOString(), String),
    review_count: safeGet(item, 'review_count', 0, Number),
    stability: safeGet(item, 'stability', 0, Number),
    lapses: safeGet(item, 'lapses', 0, Number),
    previous_interval: safeGet(item, 'previous_interval', 0, Number),

    // FSRS fields
    fsrs_due: safeGet(item, 'fsrs_due', null),
    fsrs_stability: safeGet(item, 'fsrs_stability', null),
    fsrs_difficulty: safeGet(item, 'fsrs_difficulty', 0.3, Number),
    fsrs_elapsed_days: safeGet(item, 'fsrs_elapsed_days', 0, Number),
    fsrs_scheduled_days: safeGet(item, 'fsrs_scheduled_days', 0, Number),
    fsrs_reps: safeGet(item, 'fsrs_reps', 0, Number),
    fsrs_lapses: safeGet(item, 'fsrs_lapses', 0, Number),
    fsrs_state: safeGet(item, 'fsrs_state', 0, Number),
    fsrs_last_review: safeGet(item, 'fsrs_last_review', null),

    // Additional fields
    created_at: safeGet(item, 'created_at', new Date().toISOString(), String),
    last_updated_at: safeGet(item, 'last_updated_at', undefined),
    success_streak: safeGet(item, 'success_streak', undefined),
    failure_streak: safeGet(item, 'failure_streak', undefined),
    difficulty: safeGet(item, 'difficulty', undefined),

    // Session data initialized as empty
    sessionData: {},
  };
}

/**
 * Maps multiple database records to StudyWord objects
 * @param items Array of database rows from study_words table
 * @returns Array of fully typed StudyWord objects
 */
export function mapToStudyWords(items: DatabaseRecord[]): StudyWord[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapToStudyWord);
}

/**
 * Maps a database query result to a properly typed SentenceWord object
 * @param item Database row from sentence_words table with related data
 * @returns A fully typed SentenceWord object
 */
export function mapToSentenceWord(item: DatabaseRecord): SentenceWord {
  const base = item as Tables<'sentence_words'>;
  return {
    ...base,
    root: safeGet(item, 'root', null),
    word_type: safeGet(item, 'word_type', null),
    sentence: safeGet(item, 'sentence', null),
    arabic_audio_url: safeGet(item, 'arabic_audio_url', null),
    english_audio_url: safeGet(item, 'english_audio_url', null),
    audio_start: safeGet(item, 'audio_start', null),
    audio_end: safeGet(item, 'audio_end', null),
  };
}

/**
 * Maps a database query result to a properly typed Article object
 * @param item Database row from articles table with related data
 * @returns A fully typed Article object
 */
export function mapToArticle(item: DatabaseRecord): Article {
  const base = item as Tables<'articles'>;
  return {
    ...base,
    article_sentences: safeGet(item, 'article_sentences', [], (val: unknown): ArticleSentence[] =>
      Array.isArray(val) ? val.map(mapToArticleSentence) : []
    ),
    category: safeGet(item, 'category', undefined),
    author: safeGet(item, 'author', null),
    audio_url: safeGet(item, 'audio_url', null),
  };
}

/**
 * Maps multiple database records to Article objects
 * @param items Array of database rows from articles table
 * @returns Array of fully typed Article objects
 */
export function mapToArticles(items: DatabaseRecord[]): Article[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapToArticle);
}

/**
 * Maps a database query result to a properly typed ArticleSentence object
 * @param item Database row from article_sentences table with related data
 * @returns A fully typed ArticleSentence object
 */
export function mapToArticleSentence(item: DatabaseRecord): ArticleSentence {
  const base = item as Tables<'article_sentences'>;
  return {
    ...base,
    sentence_words: safeGet(item, 'sentence_words', [], (val: unknown): SentenceWord[] =>
      Array.isArray(val) ? val.map(mapToSentenceWord) : []
    ),
  };
}
