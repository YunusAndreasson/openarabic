import { supabase } from './supabase';
import type { Article } from '../types/articles.types';
import { DatabaseError } from '../types/error.types';
import { handleError } from '../utils/errorHandling';
import { mapToArticle, mapToArticles } from '../utils/typeMappers';

// Define different column sets for different use cases
const MINIMAL_COLUMNS = `
  id,
  title,
  created_at,
  difficulty_level,
  category_id,
  author_id
`;

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
  category:categories(id, name),
  author:authors(id, name)
`;

const CARD_VIEW_COLUMNS = `
  ${LIST_VIEW_COLUMNS},
  article_sentences(id)
`;

const DETAIL_VIEW_COLUMNS = `
  *,
  category:categories(id, name),
  author:authors(id, name),
  article_sentences(
    id,
    position,
    arabic,
    english,
    article_id,
    audio_url,
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
      audio_start,
      audio_end,
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
  category:categories(id, name),
  author:authors(id, name),
  article_sentences(
    id,
    sentence_words(root_id)
  )
`;

interface GetArticlesOptions {
  categoryId?: number;
  authorId?: number;
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
    try {
      const {
        categoryId,
        authorId,
        limit = 50,
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

      const { data, error } = await query;
      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load articles',
          analyticsProperties: {
            ...(categoryId !== undefined && { categoryId }),
            ...(authorId !== undefined && { authorId }),
            limit,
            offset,
          },
        });
        throw error;
      }
      return mapToArticles(data || []);
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error('Unknown error loading articles'), {
        toastMessage: 'Failed to load articles',
        analyticsProperties: {
          ...(options.categoryId !== undefined && { categoryId: options.categoryId }),
          ...(options.authorId !== undefined && { authorId: options.authorId }),
          ...(options.limit !== undefined && { limit: options.limit }),
          ...(options.offset !== undefined && { offset: options.offset }),
        },
      });
      throw err;
    }
  },

  // Optimized method for getting minimal article data (for dropdowns, etc.)
  async getArticlesMinimal(
    categoryId?: number,
    authorId?: number
  ): Promise<
    Pick<
      Article,
      'id' | 'title' | 'difficulty_level' | 'category_id' | 'author_id' | 'created_at'
    >[]
  > {
    try {
      let query = supabase.from('articles').select(MINIMAL_COLUMNS);

      if (categoryId) query = query.eq('category_id', categoryId);
      if (authorId) query = query.eq('author_id', authorId);

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load articles',
          analyticsProperties: {
            ...(categoryId !== undefined && { categoryId }),
            ...(authorId !== undefined && { authorId }),
          },
        });
        throw error;
      }
      return data || [];
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error('Unknown error loading articles'), {
        toastMessage: 'Failed to load articles',
        analyticsProperties: {
          ...(categoryId !== undefined && { categoryId }),
          ...(authorId !== undefined && { authorId }),
        },
      });
      throw err;
    }
  },

  // Optimized method for getting articles with word statistics for due words analysis
  async getArticlesWithWordStats(): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(ARTICLES_WITH_WORD_STATS)
        .order('created_at', { ascending: false });

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load articles with word stats',
        });
        throw error;
      }
      return mapToArticles((data || []) as any);
    } catch (err) {
      await handleError(
        err instanceof Error ? err : new Error('Unknown error loading articles with word stats'),
        {
          toastMessage: 'Failed to load articles with word stats',
        }
      );
      throw err;
    }
  },

  async getArticleById(id: number): Promise<Article> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(DETAIL_VIEW_COLUMNS)
        .eq('id', id)
        .single();

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load article',
          analyticsProperties: { id },
        });
        throw error;
      }

      return mapToArticle(data);
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error('Unknown error loading article'), {
        toastMessage: 'Failed to load article',
        analyticsProperties: { id },
      });
      throw err;
    }
  },

  // Optimized method for getting article metadata only (for cards, lists)
  async getArticleCard(id: number): Promise<Article> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(CARD_VIEW_COLUMNS)
        .eq('id', id)
        .single();

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load article',
          analyticsProperties: { id },
        });
        throw error;
      }

      return mapToArticle(data);
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error('Unknown error loading article'), {
        toastMessage: 'Failed to load article',
        analyticsProperties: { id },
      });
      throw err;
    }
  },

  // Optimized method for getting multiple articles by IDs
  async getArticlesByIds(ids: number[], includeWordStats = false): Promise<Article[]> {
    if (!ids.length) return [];

    try {
      const columns = includeWordStats ? ARTICLES_WITH_WORD_STATS : CARD_VIEW_COLUMNS;
      const { data, error } = await supabase
        .from('articles')
        .select(columns)
        .in('id', ids)
        .order('created_at', { ascending: false });

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load articles',
          analyticsProperties: { idsCount: ids.length },
        });
        throw error;
      }

      return mapToArticles(data || []);
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error('Unknown error loading articles'), {
        toastMessage: 'Failed to load articles',
        analyticsProperties: { idsCount: ids.length },
      });
      throw err;
    }
  },

  async getRelatedArticles(articleId: number, limit = 5): Promise<Article[]> {
    try {
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('author_id, category_id')
        .eq('id', articleId)
        .single();

      if (articleError) {
        await handleError(new Error(articleError.message), {
          toastMessage: 'Failed to load related articles',
          analyticsProperties: { articleId },
        });
        return [];
      }

      if (!article) return [];

      // Prioritize same author, then same category
      const { data, error } = await supabase
        .from('articles')
        .select(LIST_VIEW_COLUMNS)
        .neq('id', articleId)
        .or(`author_id.eq.${article.author_id},category_id.eq.${article.category_id}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load related articles',
          analyticsProperties: { articleId, authorId: article.author_id },
        });
        return [];
      }

      return mapToArticles(data || []);
    } catch (err) {
      await handleError(
        err instanceof Error ? err : new Error('Unknown error loading related articles'),
        {
          toastMessage: 'Failed to load related articles',
          analyticsProperties: { articleId },
          showToast: false,
        }
      );
      return [];
    }
  },

  async getOtherCategoryArticles(
    categoryId: number,
    articleId?: number,
    limit = 10
  ): Promise<Article[]> {
    try {
      let query = supabase
        .from('articles')
        .select(LIST_VIEW_COLUMNS)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Exclude current article if articleId is provided
      if (articleId) {
        query = query.neq('id', articleId);
      }

      const { data, error } = await query;

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load category articles',
          analyticsProperties: {
            categoryId,
            ...(articleId !== undefined && { articleId }),
          },
        });
        return [];
      }

      return mapToArticles(data || []);
    } catch (err) {
      await handleError(
        err instanceof Error ? err : new Error('Unknown error loading category articles'),
        {
          toastMessage: 'Failed to load category articles',
          analyticsProperties: {
            categoryId,
            ...(articleId !== undefined && { articleId }),
          },
          showToast: false,
        }
      );
      return [];
    }
  },

  // New method for getting articles count (for pagination)
  async getArticlesCount(categoryId?: number, authorId?: number): Promise<number> {
    try {
      let query = supabase.from('articles').select('id', { count: 'exact', head: true });

      if (categoryId) query = query.eq('category_id', categoryId);
      if (authorId) query = query.eq('author_id', authorId);

      const { count, error } = await query;

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to get articles count',
          analyticsProperties: {
            ...(categoryId !== undefined && { categoryId }),
            ...(authorId !== undefined && { authorId }),
          },
        });
        return 0;
      }

      return count || 0;
    } catch (err) {
      await handleError(
        err instanceof Error ? err : new Error('Unknown error getting articles count'),
        {
          toastMessage: 'Failed to get articles count',
          analyticsProperties: {
            ...(categoryId !== undefined && { categoryId }),
            ...(authorId !== undefined && { authorId }),
          },
        }
      );
      return 0;
    }
  },
};
