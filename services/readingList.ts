import { supabase } from './supabase';
import { Article } from '../types/articles.types';

export const readingListService = {
  /**
   * Gets articles that the user has started but not completed
   * @param userId - The user ID
   */
  async getInProgressArticles(userId: string): Promise<Article[]> {
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
      .match({ user_id: userId, completed: false })
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
  },

  /**
   * Gets articles that the user has completed
   * @param userId - The user ID
   */
  async getCompletedArticles(userId: string): Promise<(Article & { completed_at: string })[]> {
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
      .match({ user_id: userId, completed: true })
      .order('completed_at', { ascending: false });

    if (error) throw error;

    // Extract the articles from the nested structure
    const articles = (data || [])
      .filter(item => item.articles && item.completed_at) // Filter out any null articles or completed_at
      .map(item => {
        // Cast and add completed_at date
        return {
          ...(item.articles as unknown as Article),
          completed_at: item.completed_at as string,
        };
      });

    return articles;
  },

  /**
   * Adds an article to the reading list
   * @param userId - The user ID
   * @param articleId - The article ID to add to reading list
   */
  async addToReadingList(userId: string, articleId: number): Promise<void> {
    // Get the current highest position
    const { data: positionData, error: positionError } = await supabase
      .from('reading_list')
      .select('position')
      .match({ user_id: userId })
      .order('position', { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    // Calculate the next position
    const nextPosition = positionData && positionData.length > 0 ? positionData[0].position + 1 : 0;

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

    if (error) {
      throw error;
    }
  },

  /**
   * Removes an article from the reading list
   */
  async removeFromReadingList(userId: string, articleId: number): Promise<void> {
    // Delete the article from the reading list
    const { error } = await supabase
      .from('reading_list')
      .delete()
      .match({ user_id: userId, article_id: articleId });

    if (error) {
      throw new Error(`Failed to remove article from reading list: ${error.message}`);
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
    // Update the article in the reading list
    const { error } = await supabase
      .from('reading_list')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .match({ user_id: userId, article_id: articleId });

    if (error) throw error;
  },

  /**
   * Increments the read count for an article
   * @param userId - The user ID
   * @param articleId - The article ID to increment read count
   */
  async incrementReadCount(userId: string, articleId: number): Promise<void> {
    // Get the current read count
    const { data, error: fetchError } = await supabase
      .from('reading_list')
      .select('read_count')
      .match({ user_id: userId, article_id: articleId });

    // If there's an error, check if it's because the article is not in the reading list
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No rows returned, add the article to the reading list
        await this.addToReadingList(userId, articleId);
        return;
      }
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

    if (error) throw error;
  },
};
