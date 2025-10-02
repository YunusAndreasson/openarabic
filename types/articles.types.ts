import type { ArticleId, AuthorId, CategoryId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

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
export interface Article extends Omit<Tables<'articles'>, 'id' | 'category_id' | 'author_id'> {
  /** Unique article ID (branded for type safety) */
  id: ArticleId;
  /** Sentences that make up this article, with word-level data */
  article_sentences: ArticleSentence[];
  /** Category information for the article - always exists */
  category: Category;
  /** Author information for the article - always exists */
  author: Author;
  /** Category ID (branded for type safety) */
  category_id: CategoryId;
  /** Author ID (branded for type safety) */
  author_id: AuthorId;
}

/**
 * Raw article row from database with optional relations
 * Used primarily in services layer before mapping to Article
 */
export interface ArticleRow extends Tables<'articles'> {
  category?: Tables<'categories'> | null;
  author?: Tables<'authors'> | null;
  article_sentences?: ArticleSentenceRow[];
}

/**
 * Raw article sentence row from database
 * Used primarily in services layer before mapping to ArticleSentence
 */
export interface ArticleSentenceRow extends Tables<'article_sentences'> {
  sentence_words?: SentenceWordRow[];
}

/**
 * Raw sentence word row from database with optional relations
 * Used primarily in services layer before mapping to SentenceWord
 */
export interface SentenceWordRow extends Tables<'sentence_words'> {
  root?: Tables<'roots'> | null;
  word_type?: Tables<'word_types'> | null;
}

/**
 * Raw author row from database
 * Used primarily in services layer
 */
export type AuthorRow = Tables<'authors'>;
