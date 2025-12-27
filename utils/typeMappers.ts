import type {
  Article,
  ArticleRow,
  ArticleSentence,
  ArticleSentenceRow,
  SentenceWordRow,
} from '@/types/articles.types';
import type { ArticleId, AuthorId, CategoryId, RootId, UserId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

/**
 * Raw study word row from database query
 * Handles both full queries (with root relation) and stats queries (without relations)
 */
export interface StudyWordRow extends Tables<'study_words'> {
  root?: Tables<'roots'> | null;
}

/**
 * Minimum required fields from study word query
 * Stats queries don't include user_id but always include these core fields
 */
export type StudyWordQueryRow = Pick<
  StudyWordRow,
  | 'root_id'
  | 'fsrs_due'
  | 'fsrs_stability'
  | 'fsrs_difficulty'
  | 'fsrs_scheduled_days'
  | 'fsrs_reps'
  | 'fsrs_learning_steps'
  | 'fsrs_lapses'
  | 'fsrs_state'
  | 'fsrs_last_review'
  | 'created_at'
> & {
  user_id?: string;
  root?: Tables<'roots'> | null;
};

export function mapToSentenceWord(item: SentenceWordRow): SentenceWord {
  const base = item as Tables<'sentence_words'>;
  return {
    ...base,
    root_id: base.root_id as RootId,
    root: item.root ?? null,
    word_type: item.word_type ?? null,
  };
}

function mapToArticleSentence(item: ArticleSentenceRow): ArticleSentence {
  const base = item as Tables<'article_sentences'>;
  const sentenceWords = Array.isArray(item.sentence_words)
    ? item.sentence_words.map(mapToSentenceWord)
    : [];
  return {
    ...base,
    sentence_words: sentenceWords,
  };
}

export function mapToArticle(item: ArticleRow): Article {
  const base = item as Tables<'articles'>;
  const published = (item as { published?: boolean | null }).published ?? false;

  // Ensure we have the required relations
  if (!item.category || !item.author) {
    throw new Error('Article missing required category or author data');
  }

  return {
    ...base,
    id: base.id as ArticleId,
    published,
    category_id: base.category_id as CategoryId,
    author_id: base.author_id as AuthorId,
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
  return {
    root_id: row.root_id as RootId,
    // Use fallback for stats queries that don't include user_id
    user_id: (row.user_id ?? fallbackUserId) as UserId,
    fsrs_due: row.fsrs_due,
    fsrs_stability: row.fsrs_stability,
    fsrs_difficulty: row.fsrs_difficulty,
    fsrs_scheduled_days: row.fsrs_scheduled_days,
    fsrs_reps: row.fsrs_reps,
    fsrs_learning_steps: row.fsrs_learning_steps,
    fsrs_lapses: row.fsrs_lapses,
    fsrs_state: row.fsrs_state,
    fsrs_last_review: row.fsrs_last_review,
    created_at: row.created_at,
    root: row.root ?? undefined,
  };
}

/**
 * Maps an array of raw study word rows to StudyWord[]
 */
export function mapToStudyWords(rows: StudyWordQueryRow[], fallbackUserId: string): StudyWord[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => mapToStudyWord(row, fallbackUserId));
}
