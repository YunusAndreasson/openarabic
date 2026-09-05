import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Article, ArticleRow, SearchCorpusSentence } from '@/types/articles.types';
import type { ArticleId, AuthorId, CategoryId } from '@/types/branded.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';
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

/**
 * PostgREST silently truncates an unbounded `.select()` at its implicit
 * 1000-row default, so the corpus is paged. Same page size, and the same
 * reason, as `services/studyStreak.ts` and `services/studyWordsFSRS.ts`.
 */
const SEARCH_CORPUS_PAGE_SIZE = 1000;

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

interface GetArticlesOptions {
  categoryId?: CategoryId;
  authorId?: AuthorId;
  limit?: number;
  offset?: number;
  minDifficulty?: number;
  maxDifficulty?: number;
  includeWordStats?: boolean;
  sortBy?: 'created_at' | 'difficulty_level' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export const articlesService = {
  // Optimized method for getting articles with different detail levels
  async getArticles(options: GetArticlesOptions = {}): Promise<Article[]> {
    const {
      categoryId,
      authorId,
      limit = 1000,
      offset = 0,
      minDifficulty,
      maxDifficulty,
      includeWordStats = false,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    // ADDED: Validate API parameters to prevent invalid queries
    if (limit < 0 || limit > 10000) {
      throw new Error(`Invalid limit: ${limit}. Must be between 0 and 10000`);
    }
    if (offset < 0) {
      throw new Error(`Invalid offset: ${offset}. Must be non-negative`);
    }
    if (minDifficulty !== undefined && (minDifficulty < 1 || minDifficulty > 5)) {
      throw new Error(`Invalid minDifficulty: ${minDifficulty}. Must be between 1 and 5`);
    }
    if (maxDifficulty !== undefined && (maxDifficulty < 1 || maxDifficulty > 5)) {
      throw new Error(`Invalid maxDifficulty: ${maxDifficulty}. Must be between 1 and 5`);
    }
    if (
      minDifficulty !== undefined &&
      maxDifficulty !== undefined &&
      minDifficulty > maxDifficulty
    ) {
      throw new Error(`Invalid difficulty range: min (${minDifficulty}) > max (${maxDifficulty})`);
    }

    const columns = includeWordStats ? ARTICLES_WITH_WORD_STATS : CARD_VIEW_COLUMNS;
    let query = supabase.from('articles').select(columns).eq('published', true);

    // Apply filters
    if (categoryId) query = query.eq('category_id', categoryId);
    if (authorId) query = query.eq('author_id', authorId);
    if (minDifficulty) query = query.gte('difficulty_level', minDifficulty);
    if (maxDifficulty) query = query.lte('difficulty_level', maxDifficulty);

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const data = await executeQuery(() => query.overrideTypes<ArticleRow[], { merge: false }>(), {
      ...errorConfig.load,
      analyticsProperties: {
        ...(categoryId !== undefined && { categoryId }),
        ...(authorId !== undefined && { authorId }),
        limit,
        offset,
      },
    });

    return mapToArticles(data ?? []);
  },

  // Optimized method for getting articles with word statistics for due words analysis
  async getArticlesWithWordStats(): Promise<Article[]> {
    const data = await executeQuery(
      () =>
        supabase
          .from('articles')
          .select(ARTICLES_WITH_WORD_STATS)
          .eq('published', true)
          .order('created_at', {
            ascending: false,
          })
          .overrideTypes<ArticleRow[], { merge: false }>(),
      errorConfig.loadWithStats,
    );

    return mapToArticles(data ?? []);
  },

  async getArticleById(id: ArticleId): Promise<Article> {
    const data = await executeQuery(
      () =>
        supabase
          .from('articles')
          .select(DETAIL_VIEW_COLUMNS)
          .eq('id', id)
          .eq('published', true)
          .maybeSingle()
          .overrideTypes<ArticleRow, { merge: false }>(),
      {
        ...errorConfig.loadById,
        analyticsProperties: { id },
      },
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
          .in('id', ids as number[]) // Cast branded type to number[] for Supabase query
          .eq('published', true)
          .overrideTypes<ArticleRow[], { merge: false }>(),
      {
        ...errorConfig.bulkLoad,
        analyticsProperties: { count: ids.length },
      },
    );

    return mapToArticles(data ?? []);
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
   * ~5.5k rows / ~1 MB. Held in memory for the session and deliberately not
   * persisted: the `articles` query-key prefix is excluded from
   * `PERSIST_KEYS` (`utils/queryPersistence.ts`) because a payload this size
   * threatens Android's 2 MB CursorWindow.
   *
   * Unpublished articles are not filtered out here. There is no `published`
   * column on `article_sentences`, and adding the join would buy nothing: a hit
   * is only ever surfaced by joining back to the published catalogue, which
   * drops them anyway.
   */
  async getSearchCorpus(): Promise<SearchCorpusSentence[]> {
    const sentences: SearchCorpusSentence[] = [];

    for (let offset = 0; ; offset += SEARCH_CORPUS_PAGE_SIZE) {
      const page = await executeQuery(
        () =>
          supabase
            .from('article_sentences')
            .select(SEARCH_CORPUS_COLUMNS)
            .order('article_id', { ascending: true })
            .order('position', { ascending: true })
            .range(offset, offset + SEARCH_CORPUS_PAGE_SIZE - 1)
            .overrideTypes<SearchCorpusSentence[], { merge: false }>(),
        {
          ...errorConfig.loadSearchCorpus,
          analyticsProperties: { offset },
        },
      );

      sentences.push(...page);
      if (page.length < SEARCH_CORPUS_PAGE_SIZE) break;
    }

    return sentences;
  },
};
