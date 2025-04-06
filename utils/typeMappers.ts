import type { Article, ArticleSentence } from '@/types/articles.types';
import type { StudyWord, SentenceWord } from '@/types/vocabulary.types';

import { handleError } from './errorHandling';

// Disable the any rule for just these type mappers as they're designed to handle unknown shapes
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Safely maps values from a potentially unknown object shape
 * @param obj The object to safely extract values from
 * @param key The key to extract
 * @param defaultValue A default value to use if the key is missing or invalid
 * @param transform Optional transform function to apply to the value
 */
function safeGet<T>(
  obj: Record<string, any>,
  key: string,
  defaultValue: T,
  transform?: (val: any) => T
): T {
  const value = obj[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (transform) {
    try {
      return transform(value);
    } catch (e) {
      handleError(e as Error);
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
export function mapToStudyWord(item: Record<string, any>): StudyWord {
  return {
    sentence_word_id: safeGet(item, 'sentence_word_id', 0, Number),
    user_id: safeGet(item, 'user_id', '', String),
    sentence_word: safeGet(item, 'sentence_word', undefined, val =>
      val ? mapToSentenceWord(val) : undefined
    ),

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
export function mapToStudyWords(items: Record<string, any>[]): StudyWord[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapToStudyWord);
}

/**
 * Maps a database query result to a properly typed SentenceWord object
 * @param item Database row from sentence_words table with related data
 * @returns A fully typed SentenceWord object
 */
export function mapToSentenceWord(item: Record<string, any>): SentenceWord {
  const result = item as SentenceWord;
  // Ensure required properties are present
  result.root = safeGet(item, 'root', null);
  result.word_type = safeGet(item, 'word_type', null);
  result.sentence = safeGet(item, 'sentence', null);
  result.audio_url = safeGet(item, 'audio_url', null);
  result.audio_start = safeGet(item, 'audio_start', null);
  result.audio_end = safeGet(item, 'audio_end', null);
  return result;
}

/**
 * Maps a database query result to a properly typed Article object
 * @param item Database row from articles table with related data
 * @returns A fully typed Article object
 */
export function mapToArticle(item: Record<string, any>): Article {
  const result = item as Article;
  // Ensure required properties are present
  result.article_sentences = safeGet(item, 'article_sentences', [], val =>
    Array.isArray(val) ? val.map(mapToArticleSentence) : []
  );
  result.category = safeGet(item, 'category', undefined);
  result.author = safeGet(item, 'author', null);
  result.audio_url = safeGet(item, 'audio_url', null);
  return result;
}

/**
 * Maps multiple database records to Article objects
 * @param items Array of database rows from articles table
 * @returns Array of fully typed Article objects
 */
export function mapToArticles(items: Record<string, any>[]): Article[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapToArticle);
}

/**
 * Maps a database query result to a properly typed ArticleSentence object
 * @param item Database row from article_sentences table with related data
 * @returns A fully typed ArticleSentence object
 */
export function mapToArticleSentence(item: Record<string, any>): ArticleSentence {
  const result = item as ArticleSentence;
  // Ensure sentence_words is always an array and audio_url is present
  result.sentence_words = safeGet(item, 'sentence_words', [], val =>
    Array.isArray(val) ? val.map(mapToSentenceWord) : []
  );
  result.audio_url = safeGet(item, 'audio_url', null);
  return result;
}
