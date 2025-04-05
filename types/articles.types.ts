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
 * Core type used across article listings, detail views, and bookmarks
 */
export interface Article extends Tables<'articles'> {
  /** Sentences that make up this article, with word-level data */
  article_sentences?: ArticleSentence[];
  /** Category information for the article */
  category?: Category;
  /** Author information for the article */
  author: Author | null;
  /** URL to the audio recording for the article */
  audio_url: string | null;
  /** When the user last opened this article */
  last_opened_at?: string;
  /** Image placeholders for optimized loading */
  placeholder?: {
    /** BlurHash encoding for progressive image loading */
    blurhash?: string;
    /** ThumbHash encoding for progressive image loading */
    thumbhash?: string;
  };
}
