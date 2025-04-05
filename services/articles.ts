import { createClient } from '@supabase/supabase-js';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';
import type { Article } from '../types/articles.types';
import type { Database } from '../types/database.types';
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
      root:roots(id, letters, meaning),
      word_type:word_types(id, name)
    )
  )
`;

export const articlesService = {
  async getArticles(categoryId?: number, authorId?: number): Promise<Article[]> {
    let query = supabase.from('articles').select(LIST_VIEW_COLUMNS);

    if (categoryId) query = query.eq('category_id', categoryId);
    if (authorId) query = query.eq('author_id', authorId);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      handleError(error, {
        toastMessage: 'Failed to load articles',
        analyticsEventName: 'Articles_Load_Error',
        sentrySeverity: 'error',
        analyticsProperties: {
          ...(categoryId !== undefined && { categoryId }),
          ...(authorId !== undefined && { authorId }),
        },
      });
      throw error;
    }
    return mapToArticles(data || []);
  },

  async getArticleById(id: number): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .select(DETAIL_VIEW_COLUMNS)
      .eq('id', id)
      .single();

    if (error) {
      handleError(error, {
        toastMessage: 'Failed to load article',
        analyticsEventName: 'Article_Load_Error',
        sentrySeverity: 'error',
        analyticsProperties: { articleId: id },
      });
      throw error;
    }

    if (!data) {
      const error = new Error(`Article with id ${id} not found`);
      handleError(error, {
        toastMessage: 'Article not found',
        analyticsEventName: 'Article_Not_Found',
        sentrySeverity: 'warning',
        analyticsProperties: { articleId: id },
      });
      throw error;
    }

    return mapToArticle(data);
  },

  async getRelatedArticles(articleId: number): Promise<Article[]> {
    try {
      // Get the article's category first
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('category_id')
        .eq('id', articleId)
        .single();

      if (articleError) {
        handleError(articleError, {
          toastMessage: 'Failed to load related articles',
          analyticsEventName: 'Related_Articles_Load_Error',
          sentrySeverity: 'warning',
          analyticsProperties: { articleId },
        });
        return [];
      }

      if (!article) {
        return [];
      }

      // Get related articles from the same category
      const { data, error } = await supabase
        .from('articles')
        .select(LIST_VIEW_COLUMNS)
        .eq('category_id', article.category_id)
        .neq('id', articleId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        handleError(error, {
          toastMessage: 'Failed to load related articles',
          analyticsEventName: 'Related_Articles_Load_Error',
          sentrySeverity: 'warning',
          analyticsProperties: { articleId, categoryId: article.category_id },
        });
        return [];
      }

      return mapToArticles(data || []);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Unknown error loading related articles');
      handleError(error, {
        toastMessage: 'Failed to load related articles',
        analyticsEventName: 'Related_Articles_Load_Error',
        sentrySeverity: 'warning',
        showToast: false, // Don't show toast for this fallback case
      });
      return [];
    }
  },

  async getOtherCategoryArticles(categoryId: number): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(LIST_VIEW_COLUMNS)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        handleError(error, {
          toastMessage: 'Failed to load category articles',
          analyticsEventName: 'Category_Articles_Load_Error',
          sentrySeverity: 'warning',
          analyticsProperties: { categoryId },
        });
        return [];
      }

      return mapToArticles(data || []);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Unknown error loading category articles');
      handleError(error, {
        toastMessage: 'Failed to load category articles',
        analyticsEventName: 'Category_Articles_Load_Error',
        sentrySeverity: 'warning',
        showToast: false,
      });
      return [];
    }
  },
};
