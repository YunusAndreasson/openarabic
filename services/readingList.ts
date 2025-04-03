import { supabase } from './supabase';
import { Article } from '../types/articles.types';
import { handleError } from '../utils/errorHandling';

export const readingListService = {
  /**
   * Gets articles that the user has started but not completed
   * @param userId - The user ID
   */
  async getInProgressArticles(userId: string): Promise<Article[]> {
    const { data, error } = await supabase
      .from('reading_list')
      .select(
        `
        article_id,
        articles:article_id(
          *,
          category:categories(*),
          author:authors(*)
        )
      `
      )
      .match({ user_id: userId, completed: false })
      .order('position', { ascending: true });

    if (error) {
      handleError(error, {
        toastMessage: 'Failed to load reading list',
        analyticsEventName: 'Reading_List_Load_Error',
        sentrySeverity: 'error',
      });
      throw error;
    }

    const articles = (data || [])
      .filter(item => item.articles)
      .map(item => item.articles as unknown as Article);

    return articles;
  },

  /**
   * Gets articles that the user has completed
   * @param userId - The user ID
   */
  async getCompletedArticles(userId: string): Promise<(Article & { completed_at: string })[]> {
    const { data, error } = await supabase
      .from('reading_list')
      .select(
        `
        article_id,
        completed_at,
        articles:article_id(
          *,
          category:categories(*),
          author:authors(*)
        )
      `
      )
      .match({ user_id: userId, completed: true })
      .order('completed_at', { ascending: false });

    if (error) {
      handleError(error, {
        toastMessage: 'Failed to load completed articles',
        analyticsEventName: 'Completed_Articles_Load_Error',
        sentrySeverity: 'error',
      });
      throw error;
    }

    const articles = (data || [])
      .filter(item => item.articles && item.completed_at)
      .map(item => ({
        ...(item.articles as unknown as Article),
        completed_at: item.completed_at as string,
      }));

    return articles;
  },

  /**
   * Adds an article to the reading list
   * @param userId - The user ID
   * @param articleId - The article ID to add to reading list
   */
  async addToReadingList(userId: string, articleId: number): Promise<void> {
    const { error } = await supabase.from('reading_list').insert({
      user_id: userId,
      article_id: articleId,
      position: 0, // Add to top of list
      completed: false,
      read_count: 0,
    });

    if (error) {
      handleError(error, {
        toastMessage: 'Failed to add to reading list',
        analyticsEventName: 'Reading_List_Add_Error',
        sentrySeverity: 'error',
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
        toastMessage: 'Failed to remove from reading list',
        analyticsEventName: 'Reading_List_Remove_Error',
        sentrySeverity: 'error',
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
        toastMessage: 'Failed to check reading list status',
        analyticsEventName: 'Reading_List_Check_Error',
        sentrySeverity: 'warning',
        showToast: false, // Don't show toast for this check
      });
      throw error;
    }

    return !!data;
  },

  /**
   * Gets the user's reading list
   */
  async getReadingList(userId: string): Promise<
    {
      user_id: string;
      article_id: number;
      position: number;
      completed: boolean;
      completed_at: string | null;
      read_count: number;
      added_at: string;
      articles: Article & { author: { id: number; name: string } };
    }[]
  > {
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
      handleError(error, {
        toastMessage: 'Failed to load reading list',
        analyticsEventName: 'Reading_List_Load_Error',
        sentrySeverity: 'error',
      });
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
    const { error } = await supabase
      .from('reading_list')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .match({ user_id: userId, article_id: articleId });

    if (error) {
      handleError(error, {
        toastMessage: 'Failed to mark article as completed',
        analyticsEventName: 'Article_Complete_Error',
        sentrySeverity: 'error',
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
        // No rows returned, add the article to the reading list
        await this.addToReadingList(userId, articleId);
        return;
      }
      handleError(fetchError, {
        toastMessage: 'Failed to update read count',
        analyticsEventName: 'Read_Count_Error',
        sentrySeverity: 'warning',
        analyticsProperties: { articleId },
      });
      throw fetchError;
    }

    // If no data or empty array, add the article to the reading list
    if (!data || data.length === 0) {
      await this.addToReadingList(userId, articleId);
      return;
    }

    // Increment the read count
    const { error } = await supabase
      .from('reading_list')
      .update({
        read_count: (data[0]?.read_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .match({ user_id: userId, article_id: articleId });

    if (error) {
      handleError(error, {
        toastMessage: 'Failed to update read count',
        analyticsEventName: 'Read_Count_Update_Error',
        sentrySeverity: 'error',
        analyticsProperties: { articleId },
      });
      throw error;
    }
  },
};
