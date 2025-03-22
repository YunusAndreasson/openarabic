import { supabase } from './supabase';
import { Article } from '../types/articles.types';

// Simple in-memory cache for current user
let cachedUser: { id: string } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let userCacheExpiry = 0;

export const readingListService = {
  /**
   * Get the current authenticated user, using cache when available
   */
  async getCurrentUser() {
    const now = Date.now();
    if (cachedUser && now < userCacheExpiry) {
      return cachedUser;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (data?.user) {
      cachedUser = data.user;
      userCacheExpiry = now + CACHE_DURATION;
    } else {
      cachedUser = null;
    }

    return cachedUser;
  },

  /**
   * Gets articles that the user has started but not completed
   */
  async getInProgressArticles(): Promise<Article[]> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('reading_list')
        .select(
          `
          article_id,
          articles:article_id(
            id,
            title,
            slug,
            content,
            excerpt,
            feature_image,
            published_at,
            created_at,
            updated_at,
            category:categories(id, name, slug),
            author:authors(id, name, bio, profile_image)
          )
        `
        )
        .match({ user_id: user.id, completed: false })
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || [])
        .filter(item => item.articles)
        .map(item => item.articles as unknown as Article);
    } catch (error) {
      console.error('Error fetching in-progress articles:', error);
      throw error;
    }
  },

  /**
   * Gets articles that the user has completed
   */
  async getCompletedArticles(): Promise<(Article & { completed_at: string })[]> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('reading_list')
        .select(
          `
          article_id,
          completed_at,
          articles:article_id(
            id,
            title,
            slug,
            content,
            excerpt,
            feature_image,
            published_at,
            created_at,
            updated_at,
            category:categories(id, name, slug),
            author:authors(id, name, bio, profile_image)
          )
        `
        )
        .match({ user_id: user.id, completed: true })
        .order('completed_at', { ascending: false });

      if (error) throw error;

      return (data || [])
        .filter(item => item.articles)
        .map(item => ({
          ...(item.articles as unknown as Article),
          completed_at: item.completed_at,
        }));
    } catch (error) {
      console.error('Error fetching completed articles:', error);
      throw error;
    }
  },

  /**
   * Adds an article to the reading list
   * - Can be called with just articleId (gets user from session)
   * - Can be called with userId and articleId explicitly
   */
  async addToReadingList(
    articleIdOrUserId: number | string,
    maybeArticleId?: number
  ): Promise<void> {
    try {
      let userId: string;
      let articleId: number;

      if (maybeArticleId !== undefined) {
        // Called as addToReadingList(userId, articleId)
        userId = articleIdOrUserId as string;
        articleId = maybeArticleId;
      } else {
        // Called as addToReadingList(articleId)
        const user = await this.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        userId = user.id;
        articleId = articleIdOrUserId as number;
      }

      // Get position and insert in a single transaction to prevent race conditions
      const { data, error } = await supabase.rpc('add_to_reading_list', {
        p_user_id: userId,
        p_article_id: articleId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding to reading list:', error);
      throw error;
    }
  },

  /**
   * Removes an article from the reading list
   */
  async removeFromReadingList(articleId: number): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('reading_list')
        .delete()
        .match({ user_id: user.id, article_id: articleId });

      if (error) throw error;
    } catch (error) {
      console.error('Error removing from reading list:', error);
      throw error;
    }
  },

  /**
   * Deletes an article from the reading list
   */
  async deleteFromReadingList(articleId: number): Promise<void> {
    try {
      // Get the current user ID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error('User must be logged in to update reading list');
      }

      // Delete the article from the reading list
      const { error } = await supabase
        .from('reading_list')
        .delete()
        .match({ user_id: user.id, article_id: articleId });

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Checks if an article is in the user's reading list
   */
  async isInReadingList(articleId: number): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('reading_list')
        .select('article_id')
        .match({ user_id: user.id, article_id: articleId })
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking reading list status:', error);
      return false;
    }
  },

  /**
   * Gets the user's reading list
   */
  async getReadingList(): Promise<any[]> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('reading_list')
        .select(
          `
          id,
          article_id,
          position,
          completed,
          completed_at,
          read_count,
          articles:article_id(
            id,
            title,
            slug,
            excerpt,
            feature_image,
            published_at,
            author:authors(id, name, profile_image)
          )
        `
        )
        .match({ user_id: user.id })
        .order('position', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting reading list:', error);
      return [];
    }
  },

  /**
   * Marks an article as completed
   */
  async markAsCompleted(articleId: number): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reading_list')
        .update({
          completed: true,
          completed_at: now,
          updated_at: now,
        })
        .match({ user_id: user.id, article_id: articleId });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking article as completed:', error);
      throw error;
    }
  },

  /**
   * Increments the read count for an article
   */
  async incrementReadCount(articleId: number): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Use RPC to handle this server-side in one call
      const { error } = await supabase.rpc('increment_read_count', {
        p_user_id: user.id,
        p_article_id: articleId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing read count:', error);
      throw error;
    }
  },

  /**
   * Clears the user cache - useful for logout
   */
  clearUserCache() {
    cachedUser = null;
    userCacheExpiry = 0;
  },
};
