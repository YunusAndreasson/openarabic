import { supabase } from './supabase';
import { Article } from '../types/articles.types';

export const readingListService = {
  /**
   * Gets articles that the user has started but not completed
   */
  async getInProgressArticles(): Promise<Article[]> {
    try {
      // Get the current user ID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        // If no user is logged in, return an empty array
        return [];
      }

      // Get articles from reading_list that are not completed
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
        .match({ user_id: user.id, completed: false })
        .order('position', { ascending: true });

      if (error) throw error;

      // Extract the articles from the nested structure
      const articles = (data || [])
        .filter(item => item.articles) // Filter out any null articles
        .map(item => {
          // Cast to the correct Article type
          return item.articles as unknown as Article;
        });

      return articles;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Gets articles that the user has completed
   */
  async getCompletedArticles(): Promise<(Article & { completed_at: string })[]> {
    try {
      // Get the current user ID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        // If no user is logged in, return an empty array
        return [];
      }

      // Get articles from reading_list that are completed
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
        .match({ user_id: user.id, completed: true })
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Extract the articles from the nested structure
      const articles = (data || [])
        .filter(item => item.articles) // Filter out any null articles
        .map(item => {
          // Cast and add completed_at date
          return {
            ...(item.articles as unknown as Article),
            completed_at: item.completed_at,
          };
        });

      return articles;
    } catch (error) {
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
      // Handle both function signatures
      let userId: string;
      let articleId: number;

      if (maybeArticleId !== undefined) {
        // Called as addToReadingList(userId, articleId)
        userId = articleIdOrUserId as string;
        articleId = maybeArticleId;
      } else {
        // Called as addToReadingList(articleId)
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error('User not authenticated');

        userId = user.id;
        articleId = articleIdOrUserId as number;
      }

      // Now use userId and articleId for the rest of the function
      // Get the current highest position
      const { data: positionData, error: positionError } = await supabase
        .from('reading_list')
        .select('position')
        .match({ user_id: userId })
        .order('position', { ascending: false })
        .limit(1);

      if (positionError) throw positionError;

      // Calculate the next position
      const nextPosition =
        positionData && positionData.length > 0 ? positionData[0].position + 1 : 0;

      // Use upsert to add or update the article in the reading list
      const insertData = {
        user_id: userId,
        article_id: articleId,
        position: nextPosition,
        completed: false,
        read_count: 0,
        added_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('reading_list')
        .upsert(insertData, { onConflict: 'user_id,article_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding to reading list:', error);
      throw error;
    }
  },

  /**
   * Removes an article from the reading list
   */
  async removeFromReadingList(userId: string, articleId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('reading_list')
        .delete()
        .match({ user_id: userId, article_id: articleId });

      if (error) throw error;
    } catch (error) {
      console.error('Error removing from reading list:', error);
      throw error;
    }
  },

  /**
   * Deletes an article from the reading list
   * @deprecated Use removeFromReadingList instead with explicit userId
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

      // Delete the article from the reading list using removeFromReadingList
      await this.removeFromReadingList(user.id, articleId);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Checks if an article is in the user's reading list
   */
  async isInReadingList(userId: string, articleId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('reading_list')
        .select('article_id')
        .match({ user_id: userId, article_id: articleId })
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking reading list status:', error);
      throw error;
    }
  },

  /**
   * Gets the user's reading list
   */
  async getReadingList(userId: string): Promise<any[]> {
    try {
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

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting reading list:', error);
      throw error;
    }
  },

  /**
   * Marks an article as completed
   */
  async markAsCompleted(articleId: number): Promise<void> {
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

      // Update the article in the reading list
      const { error } = await supabase
        .from('reading_list')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .match({ user_id: user.id, article_id: articleId });

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Increments the read count for an article
   */
  async incrementReadCount(articleId: number): Promise<void> {
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

      // Get the current read count
      try {
        const { data, error: fetchError } = await supabase
          .from('reading_list')
          .select('read_count')
          .match({ user_id: user.id, article_id: articleId });

        if (fetchError) throw fetchError;

        // If no data or empty array, add the article to the reading list
        if (!data || data.length === 0) {
          await this.addToReadingList(articleId);
          return;
        }

        // Increment the read count
        const { error } = await supabase
          .from('reading_list')
          .update({
            read_count: (data[0]?.read_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .match({ user_id: user.id, article_id: articleId });

        if (error) throw error;
      } catch (fetchError: any) {
        // If there's an error, check if it's because the article is not in the reading list
        if (fetchError.code === 'PGRST116') {
          // No rows returned
          await this.addToReadingList(articleId);
          return;
        }
        throw fetchError;
      }
    } catch (error) {
      throw error;
    }
  },
};
