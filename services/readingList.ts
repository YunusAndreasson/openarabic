import type { Article } from '../types/articles.types';
import { handleError } from '../utils/errorHandling';

import { supabase } from './supabase';

// Define shared types to improve type safety
type ReadingListItem = {
  user_id: string;
  article_id: number;
  added_at: string;
  articles: Article & {
    author: {
      id: number;
      name: string;
    };
  };
};

type SupabaseArticleJoinResult = {
  article_id: number;
  articles: Article;
};

// Shared error handling configuration
const errorConfig = {
  readingList: {
    load: {
      toastMessage: 'Failed to load reading list',
      analyticsEventName: 'Reading_List_Load_Error',
      sentrySeverity: 'error' as const,
    },
    add: {
      toastMessage: 'Failed to add to reading list',
      analyticsEventName: 'Reading_List_Add_Error',
      sentrySeverity: 'error' as const,
    },
    remove: {
      toastMessage: 'Failed to remove from reading list',
      analyticsEventName: 'Reading_List_Remove_Error',
      sentrySeverity: 'error' as const,
    },
    check: {
      toastMessage: 'Failed to check reading list status',
      analyticsEventName: 'Reading_List_Check_Error',
      sentrySeverity: 'warning' as const,
      showToast: false,
    },
  },
};

// Shared query fragments
const articleJoinQuery = `
  article_id,
  articles:article_id(
    *,
    category:categories(*),
    author:authors(*)
  )
`;

export const readingListService = {
  /**
   * Gets all reading list articles
   * @param userId - The user ID
   */
  async getInProgressArticles(userId: string): Promise<Article[]> {
    const { data, error } = await supabase
      .from('reading_list')
      .select(articleJoinQuery)
      .match({ user_id: userId });

    if (error) {
      handleError(error, errorConfig.readingList.load);
      throw error;
    }

    return (data || [])
      .filter((item: SupabaseArticleJoinResult) => item.articles)
      .map((item: SupabaseArticleJoinResult) => item.articles);
  },

  /**
   * Adds an article to the reading list
   * @param userId - The user ID
   * @param articleId - The article ID to add to reading list
   */
  async addToReadingList(userId: string, articleId: number): Promise<void> {
    // First check if the article is already in the reading list
    const { data, error: checkError } = await supabase
      .from('reading_list')
      .select('article_id')
      .match({ user_id: userId, article_id: articleId })
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      handleError(checkError);
      throw checkError;
    }

    // If article already exists, do nothing
    if (data) {
      return;
    }

    const { error } = await supabase.from('reading_list').insert({
      user_id: userId,
      article_id: articleId,
      // The added_at field has a default value in the database (now())
    });

    if (error) {
      handleError(error, {
        ...errorConfig.readingList.add,
        analyticsProperties: { articleId },
      });
      throw error;
    }
  },

  /**
   * Removes an article from the reading list
   */
  async removeFromReadingList(userId: string, articleId: number): Promise<void> {
    const { error } = await supabase
      .from('reading_list')
      .delete()
      .match({ user_id: userId, article_id: articleId });

    if (error) {
      handleError(error, {
        ...errorConfig.readingList.remove,
        analyticsProperties: { articleId },
      });
      throw error;
    }
  },

  /**
   * Checks if an article is in the user's reading list
   */
  async isInReadingList(userId: string, articleId: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('reading_list')
      .select('article_id')
      .match({ user_id: userId, article_id: articleId })
      .single();

    if (error && error.code !== 'PGRST116') {
      handleError(error, {
        ...errorConfig.readingList.check,
        analyticsProperties: { articleId },
      });
      throw error;
    }

    return !!data;
  },

  /**
   * Gets the user's reading list
   */
  async getReadingList(userId: string): Promise<ReadingListItem[]> {
    const { data, error } = await supabase
      .from('reading_list')
      .select(
        `
        *,
        articles:article_id(
          *,
          author:authors(*)
        )
      `
      )
      .match({ user_id: userId })
      .order('added_at', { ascending: false });

    if (error) {
      handleError(error, errorConfig.readingList.load);
      throw error;
    }

    return data || [];
  },
};
