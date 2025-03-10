import type { Tables } from './database.types';
import { SentenceWord } from './vocabulary.types';

/**
 * Category type used across multiple components
 */
export type Category = Tables<'categories'>;

export type ArticleSentence = Tables<'article_sentences'> & {
  sentence_words: SentenceWord[];
};

export type Article = Tables<'articles'> & {
  category: Category | null;
  author: Tables<'authors'> | null;
  article_sentences: ArticleSentence[];
  audio_url: string | null;
  last_opened_at?: string;
};

/**
 * Parameters for the article screen route
 */
export interface ArticleScreenParams {
  id: string;
  title?: string;
}
