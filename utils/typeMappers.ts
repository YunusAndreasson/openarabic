import type {
  Article,
  ArticleRow,
  ArticleSentence,
  ArticleSentenceRow,
  SentenceWordRow,
} from '@/types/articles.types';
import type { ArticleId, AuthorId, CategoryId, RootId, UserId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { FSRSColumn } from '@/types/fsrs.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

/**
 * Raw study word row from database query
 * Handles both full queries (with root relation) and stats queries (without relations)
 */
export interface StudyWordRow extends Tables<'study_words'> {
  root?: Tables<'roots'> | null;
}

/**
 * Minimum required fields from a study-word query.
 *
 * Stats queries omit `user_id` but always carry the identity, the audit stamp
 * and every scheduler column — the last of which comes from FSRSColumn rather
 * than a second hand-written list, so adding a column to the table cannot
 * leave the mapper reading a field the query never selected.
 */
export type StudyWordQueryRow = Pick<StudyWordRow, FSRSColumn | 'root_id' | 'created_at'> & {
  user_id?: string;
  root?: Tables<'roots'> | null;
};

export function mapToSentenceWord(item: SentenceWordRow): SentenceWord {
  return {
    ...item,
    root_id: item.root_id as RootId,
    root: item.root ?? null,
    word_type: item.word_type ?? null,
  };
}

function mapToArticleSentence(item: ArticleSentenceRow): ArticleSentence {
  const sentenceWords = Array.isArray(item.sentence_words)
    ? item.sentence_words.map(mapToSentenceWord)
    : [];
  return {
    ...item,
    sentence_words: sentenceWords,
  };
}

export function mapToArticle(item: ArticleRow): Article {
  // Ensure we have the required relations
  if (!item.category || !item.author) {
    throw new Error('Article missing required category or author data');
  }

  return {
    ...item,
    id: item.id as ArticleId,
    category_id: item.category_id as CategoryId,
    author_id: item.author_id as AuthorId,
    article_sentences: Array.isArray(item.article_sentences)
      ? item.article_sentences.map(mapToArticleSentence)
      : [],
    category: item.category,
    author: item.author,
  };
}

export function mapToArticles(items: ArticleRow[]): Article[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapToArticle);
}

/**
 * Maps a raw study word row to a StudyWord with branded IDs
 * @param row - Raw database row (with optional root relation)
 * @param fallbackUserId - User ID to use when row doesn't include user_id (stats queries)
 */
export function mapToStudyWord(row: StudyWordQueryRow, fallbackUserId: string): StudyWord {
  // Spread rather than re-list every scheduler column by hand: this was the
  // third copy of that list, and the one that silently dropped a field if it
  // fell out of step — a mapped row missing `fsrs_lapses` still satisfied
  // nothing and reached the scheduler as undefined. Only the fields that are
  // actually TRANSFORMED are named below.
  return {
    ...row,
    root_id: row.root_id as RootId,
    // Use fallback for stats queries that don't include user_id
    user_id: (row.user_id ?? fallbackUserId) as UserId,
    root: row.root ?? undefined,
  };
}
