import type { Article } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';
import { mapToArticle, mapToArticles } from '@/utils/typeMappers';
import type { ArticleRow } from '@/types/dbRow.types';

import { supabase } from './supabase';

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
    sentence_words(
      id,
      root_id
    )
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
    const {
      categoryId,
      authorId,
      limit = 100,
      offset = 0,
      minDifficulty,
      maxDifficulty,
      includeWordStats = false,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;
    try {

      const columns = includeWordStats ? ARTICLES_WITH_WORD_STATS : LIST_VIEW_COLUMNS;
      let query = supabase.from('articles').select<ArticleRow>(columns);

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
      return mapToArticles(data ?? []);
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error('Unknown error loading articles'), {
        toastMessage: 'Failed to load articles',
        analyticsProperties: {
          ...(categoryId !== undefined && { categoryId }),
          ...(authorId !== undefined && { authorId }),
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
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
        .select<ArticleRow>(ARTICLES_WITH_WORD_STATS)
        .order('created_at', { ascending: false });

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: 'Failed to load articles with word stats',
        });
        throw error;
      }
      return mapToArticles(data ?? []);
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
        .select<ArticleRow>(DETAIL_VIEW_COLUMNS)
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
        throw new Error('Article not found');
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
        .select<ArticleRow>(CARD_VIEW_COLUMNS)
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
        throw new Error('Article not found');
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
};
