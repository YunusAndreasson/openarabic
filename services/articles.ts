import { createClient } from '@supabase/supabase-js';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';
import type { Article } from '../types/articles.types';
import type { Database } from '../types/database.types';
import { DatabaseError } from '../types/error.types';
import { handleError } from '../utils/errorHandling';
import { mapToArticle, mapToArticles } from '../utils/typeMappers';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define the columns needed for list view for better performance
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
  author:authors(id, name),
  article_sentences:article_sentences(id)
`;

// Define the columns needed for detail view
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

export const articlesService = {
  async getArticles(categoryId?: number, authorId?: number): Promise<Article[]> {
    try {
      let query = supabase.from('articles').select(LIST_VIEW_COLUMNS);

      if (categoryId) query = query.eq('category_id', categoryId);
      if (authorId) query = query.eq('author_id', authorId);

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load articles',
          analyticsProperties: {
            ...(categoryId && { categoryId }),
            ...(authorId && { authorId }),
          },
        });
        throw error;
      }
      return mapToArticles(data || []);
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error('Unknown error loading articles'), {
        toastMessage: 'Failed to load articles',
        analyticsProperties: {
          ...(categoryId && { categoryId }),
          ...(authorId && { authorId }),
        },
      });
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

      if (!data) {
        const notFoundError = new Error(`Article with id ${id} not found`);
        await handleError(notFoundError, {
          toastMessage: 'Article not found',
          analyticsProperties: { id },
        });
        throw notFoundError;
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

  async getRelatedArticles(articleId: number): Promise<Article[]> {
    try {
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('author_id')
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

      const { data, error } = await supabase
        .from('articles')
        .select(LIST_VIEW_COLUMNS)
        .eq('author_id', article.author_id)
        .neq('id', articleId)
        .order('created_at', { ascending: false })
        .limit(5);

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

  async getOtherCategoryArticles(categoryId: number, articleId?: number): Promise<Article[]> {
    try {
      let query = supabase
        .from('articles')
        .select(LIST_VIEW_COLUMNS)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Exclude current article if articleId is provided
      if (articleId) {
        query = query.neq('id', articleId);
      }

      const { data, error } = await query;

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load category articles',
          analyticsProperties: { categoryId, ...(articleId && { articleId }) },
        });
        return [];
      }

      return mapToArticles(data || []);
    } catch (err) {
      await handleError(
        err instanceof Error ? err : new Error('Unknown error loading category articles'),
        {
          toastMessage: 'Failed to load category articles',
          analyticsProperties: { categoryId, ...(articleId && { articleId }) },
          showToast: false,
        }
      );
      return [];
    }
  },

  async getCategoryArticles(categoryId: number, limit = 10): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('category_id', categoryId)
        .limit(limit);

      if (error) {
        throw new DatabaseError('Failed to load category articles', {
          timestamp: new Date().toISOString(),
          details: error,
        });
      }

      return mapToArticles(data || []);
    } catch (err) {
      throw handleError(
        err instanceof Error ? err : new Error('Unknown error loading category articles')
      );
    }
  },

  async getArticlesWithSentencesAndWords(): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(DETAIL_VIEW_COLUMNS)
        .order('created_at', { ascending: false });
      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load articles with sentences and words',
        });
        throw error;
      }
      return mapToArticles(data || []);
    } catch (err) {
      await handleError(
        err instanceof Error
          ? err
          : new Error('Unknown error loading articles with sentences and words'),
        {
          toastMessage: 'Failed to load articles with sentences and words',
        }
      );
      throw err;
    }
  },
};
