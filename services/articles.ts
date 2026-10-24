import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Article, ArticleRow, SearchCorpusSentence } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery, fetchAllPages, type RequestOptions } from '@/utils/supabaseHelpers';
import { mapToArticle, mapToArticles } from '@/utils/typeMappers';

const errorConfig = {
  load: createServiceErrorConfig('articles', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
  }),
  loadWithStats: createServiceErrorConfig('articles', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
    analyticsEventName: 'Articles_With_Stats_Load_Error',
  }),
  loadById: createServiceErrorConfig('article', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLE,
  }),
  bulkLoad: createServiceErrorConfig('articles', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
    analyticsEventName: 'Articles_Bulk_Load_Error',
  }),
  loadSearchCorpus: createServiceErrorConfig('articles', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
    analyticsEventName: 'Articles_Search_Corpus_Load_Error',
  }),
};

const SEARCH_CORPUS_COLUMNS = 'article_id, position, arabic, english';

// Define different column sets for different use cases
const LIST_VIEW_COLUMNS = `
  id,
  published,
  title,
  image_url,
  created_at,
  difficulty_level,
  category_id,
  author_id,
  summary,
  audio_url,
  audio_url_bilingual,
  book,
  category:categories!inner(id, name),
  author:authors!inner(id, name)
`;

const CARD_VIEW_COLUMNS = `
  ${LIST_VIEW_COLUMNS},
  article_sentences(id)
`;

const DETAIL_VIEW_COLUMNS = `
  id,
  published,
  title,
  image_url,
  created_at,
  difficulty_level,
  category_id,
  author_id,
  summary,
  audio_url,
  audio_url_bilingual,
  book,
  category:categories!inner(id, name),
  author:authors!inner(id, name),
  article_sentences(
    id,
    position,
    arabic,
    english,
    article_id,
    audio_url,
    audio_url_bilingual,
    audio_url_english,
    sentence_words(
      id,
      position,
      word_form,
      english,
      difficulty_level,
      grammar_note,
      root_id,
      sentence_id,
      word_type_id,
      audio_url,
      root:roots(id, letters, meaning),
      word_type:word_types(id, name)
    )
  )
`;

// Optimized query for articles with word counts (for due words analysis)
const ARTICLES_WITH_WORD_STATS = `
  id,
  published,
  title,
  image_url,
  created_at,
  difficulty_level,
  category_id,
  author_id,
  summary,
  audio_url,
  audio_url_bilingual,
  category:categories!inner(id, name),
  author:authors!inner(id, name),
  article_sentences(
    id,
    sentence_words(
      id,
      root_id
    )
  )
`;

export const articlesService = {
  /**
   * The published library in the card-view shape, newest first.
   *
   * Paged: PostgREST truncates a response at 1000 rows without saying so, and
   * this used to be one request capped at exactly that — a library past 1000
   * articles would have lost its oldest ones without an error. `id` breaks
   * `created_at` ties, which pages must not split.
   */
  async getArticles(request: RequestOptions = {}): Promise<Article[]> {
    const rows = await fetchAllPages(
      (from, to, signal) =>
        supabase
          .from('articles')
          .select(CARD_VIEW_COLUMNS)
          .eq('published', true)
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to)
          .abortSignal(signal)
          .overrideTypes<ArticleRow[], { merge: false }>(),
      {
        errorConfig: offset => ({ ...errorConfig.load, analyticsProperties: { offset } }),
        request,
      },
    );

    return mapToArticles(rows);
  },

  // Optimized method for getting articles with word statistics for due words analysis
  //
  // Paged for the same reason as getArticles: it was a single unbounded
  // request, so the 1000-row cap applied to it as well.
  async getArticlesWithWordStats(request: RequestOptions = {}): Promise<Article[]> {
    const rows = await fetchAllPages(
      (from, to, signal) =>
        supabase
          .from('articles')
          .select(ARTICLES_WITH_WORD_STATS)
          .eq('published', true)
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to)
          .abortSignal(signal)
          .overrideTypes<ArticleRow[], { merge: false }>(),
      { errorConfig: errorConfig.loadWithStats, request },
    );

    return mapToArticles(rows);
  },

  async getArticleById(id: ArticleId, request: RequestOptions = {}): Promise<Article> {
    const data = await executeQuery(
      () =>
        supabase
          .from('articles')
          .select(DETAIL_VIEW_COLUMNS)
          .eq('id', id)
          .eq('published', true)
          .maybeSingle()
          .overrideTypes<ArticleRow | null, { merge: false }>(),
      {
        ...errorConfig.loadById,
        analyticsProperties: { id },
      },
      request,
    );

    if (!data) {
      throw new Error(`Article not found: ${id}`);
    }

    return mapToArticle(data);
  },

  // Optimized bulk fetch method to prevent N+1 queries
  async getArticlesByIds(ids: ArticleId[]): Promise<Article[]> {
    if (ids.length === 0) {
      return [];
    }

    const data = await executeQuery(
      () =>
        supabase
          .from('articles')
          .select(DETAIL_VIEW_COLUMNS)
          .in('id', ids)
          .eq('published', true)
          .overrideTypes<ArticleRow[], { merge: false }>(),
      {
        ...errorConfig.bulkLoad,
        analyticsProperties: { count: ids.length },
      },
    );

    return mapToArticles(data);
  },

  /**
   * Every sentence in the library, for searching the texts by their contents.
   *
   * Fetched whole rather than queried per keystroke because the database cannot
   * do this search: it has no full-text index, and neither `pg_trgm` nor
   * `unaccent` is installed, so a server-side `ilike` would miss both
   * undiacritized Arabic and unaccented transliteration — the two things
   * learners actually type. Folding happens locally instead
   * (`utils/searchNormalization.ts`), which also makes search work offline.
   *
   * ~5.5k rows / ~1 MB, so paged (PostgREST truncates every response at 1000
   * rows); `(article_id, position)` is unique, so the pages cannot overlap.
   * Held in memory for the session and deliberately not persisted: the
   * `articles` query-key prefix is excluded from `PERSIST_KEYS`
   * (`utils/queryPersistence.ts`) because a payload this size threatens
   * Android's 2 MB CursorWindow.
   *
   * Unpublished articles are not filtered out here. There is no `published`
   * column on `article_sentences`, and adding the join would buy nothing: a hit
   * is only ever surfaced by joining back to the published catalogue, which
   * drops them anyway.
   */
  getSearchCorpus(request: RequestOptions = {}): Promise<SearchCorpusSentence[]> {
    return fetchAllPages(
      (from, to, signal) =>
        supabase
          .from('article_sentences')
          .select(SEARCH_CORPUS_COLUMNS)
          .order('article_id', { ascending: true })
          .order('position', { ascending: true })
          .range(from, to)
          .abortSignal(signal),
      {
        errorConfig: offset => ({
          ...errorConfig.loadSearchCorpus,
          analyticsProperties: { offset },
        }),
        request,
      },
    );
  },
};
