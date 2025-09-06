import type { Tables } from '@/types/database.types';

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

/** Raw article with optional relations */
export interface ArticleRow extends Tables<'articles'> {
  category?: Tables<'categories'> | null;
  author?: Tables<'authors'> | null;
  article_sentences?: ArticleSentenceRow[];
}

/** Raw study word with optional root relation */
export interface StudyWordRow extends Tables<'study_words'> {
  root?: Tables<'roots'> | null;
}

/** Raw reading list item with optional relations */
export interface ReadingListItemRow extends Tables<'reading_list'> {
  articles?: ArticleRow | null;
}

/** Raw reading progress with optional relations */
export interface ReadingProgressRow extends Tables<'reading_progress'> {
  articles?: ArticleRow | null;
}
