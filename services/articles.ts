import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Article, ArticleRow } from '@/types/articles.types';
import type { ArticleId, AuthorId, CategoryId } from '@/types/branded.types';
import { executeQuery } from '@/utils/supabaseHelpers';
import { mapToArticle, mapToArticles } from '@/utils/typeMappers';

// Define different column sets for different use cases
const LIST_VIEW_COLUMNS = `
  id,
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
  author:authors!inner(id, name)
`;

const CARD_VIEW_COLUMNS = `
  ${LIST_VIEW_COLUMNS},
  article_sentences(id)
`;

const DETAIL_VIEW_COLUMNS = `
  *,
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

    const columns = includeWordStats ? ARTICLES_WITH_WORD_STATS : LIST_VIEW_COLUMNS;
    let query = supabase.from('articles').select(columns);

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

    const data = await executeQuery(() => query.returns<ArticleRow[]>(), {
      toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
      analyticsEventName: 'Articles_Load_Error',
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
          .order('created_at', {
            ascending: false,
          })
          .returns<ArticleRow[]>(),
      {
        toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
        analyticsEventName: 'Articles_With_Stats_Load_Error',
      },
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
          .single()
          .returns<ArticleRow>(),
      {
        toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLE,
        analyticsEventName: 'Article_Load_Error',
        analyticsProperties: { id },
      },
    );

    if (!data) {
      throw new Error('Article not found');
    }

    return mapToArticle(data);
  },

  // Optimized method for getting article metadata only (for cards, lists)
  async getArticleCard(id: number): Promise<Article> {
    const data = await executeQuery(
      () =>
        supabase
          .from('articles')
          .select(CARD_VIEW_COLUMNS)
          .eq('id', id)
          .single()
          .returns<ArticleRow>(),
      {
        toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLE,
        analyticsEventName: 'Article_Card_Load_Error',
        analyticsProperties: { id },
      },
    );

    if (!data) {
      throw new Error('Article not found');
    }

    return mapToArticle(data);
  },
};
