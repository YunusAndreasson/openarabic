import type { Tables } from './database.types';

/** Raw author record returned from Supabase queries */
export type AuthorRow = Tables<'authors'>;

/** Raw sentence word with optional root and word type relations */
export interface SentenceWordRow extends Tables<'sentence_words'> {
  root?: Tables<'roots'> | null;
  word_type?: Tables<'word_types'> | null;
}

/** Raw article sentence including its words */
export interface ArticleSentenceRow extends Tables<'article_sentences'> {
  sentence_words?: SentenceWordRow[];
}

/** Raw article with related category, author and sentences */
export interface ArticleRow extends Tables<'articles'> {
  category?: Tables<'categories'> | null;
  author?: AuthorRow | null;
  article_sentences?: ArticleSentenceRow[];
  audio_url: string | null;
}
