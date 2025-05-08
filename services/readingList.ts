import type { Article } from '../types/articles.types';
import { handleError } from '../utils/errorHandling';

import { supabase } from './supabase';

// Define shared types to improve type safety
type ReadingListItem = {
  user_id: string;
  article_id: number;
  completed: boolean;
  completed_at: string | null;
  read_count: number;
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
  completed_at?: string | null;
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
    complete: {
      toastMessage: 'Failed to mark article as completed',
      analyticsEventName: 'Article_Complete_Error',
      sentrySeverity: 'error' as const,
    },
    readCount: {
      toastMessage: 'Failed to update read count',
      analyticsEventName: 'Read_Count_Error',
      sentrySeverity: 'warning' as const,
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
   * Gets articles that the user has started but not completed
   * @param userId - The user ID
   */
  async getInProgressArticles(userId: string): Promise<Article[]> {
    const { data, error } = await supabase
      .from('reading_list')
      .select(articleJoinQuery)
      .match({ user_id: userId, completed: false });

    if (error) {
      handleError(error, errorConfig.readingList.load);
      throw error;
    }

    return (data || [])
      .filter((item: SupabaseArticleJoinResult) => item.articles)
      .map((item: SupabaseArticleJoinResult) => item.articles);
  },

  /**
   * Gets articles that the user has completed
   * @param userId - The user ID
   */
  async getCompletedArticles(userId: string): Promise<(Article & { completed_at: string })[]> {
    const { data, error } = await supabase
      .from('reading_list')
      .select(`${articleJoinQuery}, completed_at`)
      .match({ user_id: userId, completed: true });

    if (error) {
      handleError(error, {
        ...errorConfig.readingList.load,
        toastMessage: 'Failed to load completed articles',
      });
      throw error;
    }

    return (data || [])
      .filter((item: SupabaseArticleJoinResult) => item.articles && item.completed_at)
      .map((item: SupabaseArticleJoinResult) => ({
        ...item.articles,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        completed_at: item.completed_at!,
      }));
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
      completed: false,
      read_count: 0,
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

  /**
   * Marks an article as completed
   * @param userId - The user ID
   * @param articleId - The article ID to mark as completed
   */
  async markAsCompleted(userId: string, articleId: number): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('reading_list')
      .update({
        completed: true,
        completed_at: now,
        updated_at: now,
      })
      .match({ user_id: userId, article_id: articleId });

    if (error) {
      handleError(error, {
        ...errorConfig.readingList.complete,
        analyticsProperties: { articleId },
      });
      throw error;
    }
  },

  /**
   * Increments the read count for an article
   * @param userId - The user ID
   * @param articleId - The article ID to increment read count
   */
  async incrementReadCount(userId: string, articleId: number): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from('reading_list')
      .select('read_count')
      .match({ user_id: userId, article_id: articleId });

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        await this.addToReadingList(userId, articleId);
        return;
      }
      handleError(fetchError, {
        ...errorConfig.readingList.readCount,
        analyticsProperties: { articleId },
      });
      throw fetchError;
    }

    if (!data?.length) {
      await this.addToReadingList(userId, articleId);
      return;
    }

    const { error } = await supabase
      .from('reading_list')
      .update({
        read_count: (data[0]?.read_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .match({ user_id: userId, article_id: articleId });

    if (error) {
      handleError(error, {
        ...errorConfig.readingList.readCount,
        analyticsProperties: { articleId },
      });
      throw error;
    }
  },
};
