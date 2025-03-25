import type { Tables } from './database.types';
import { SentenceWord } from './vocabulary.types';

/**
 * Category type used across multiple components
 */
export type Category = Tables<'categories'>;

export interface ArticleSentence extends Tables<'article_sentences'> {
  sentence_words?: Tables<'sentence_words'>[];
}

export interface Article extends Tables<'articles'> {
  article_sentences?: ArticleSentence[];
  category?: Tables<'categories'>;
  author: Tables<'authors'> | null;
  audio_url: string | null;
  last_opened_at?: string;
}
