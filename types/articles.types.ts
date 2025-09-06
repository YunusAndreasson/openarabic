import type { Tables } from './database.types';
import type { SentenceWord } from './vocabulary.types';

/**
 * Category type used across multiple components
 */
export type Category = Tables<'categories'>;

/**
 * Author type from database schema
 */
export type Author = Tables<'authors'>;

/**
 * Enhanced article sentence with related sentence words
 * Used in article detail views and word highlighting components
 */
export interface ArticleSentence extends Tables<'article_sentences'> {
  /** Words within this sentence, with additional vocabulary info */
  sentence_words?: SentenceWord[];
}

/**
 * Extended article type with additional UI and relational data
 * Core type used across article listings and detail views
 */
export interface Article extends Omit<Tables<'articles'>, 'category_id' | 'author_id'> {
  /** Sentences that make up this article, with word-level data */
  article_sentences: ArticleSentence[];
  /** Category information for the article - always exists */
  category: Category;
  /** Author information for the article - always exists */
  author: Author;
  /** Category ID - always exists */
  category_id: number;
  /** Author ID - always exists */
  author_id: number;
}
