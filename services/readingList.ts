import { supabase } from './supabase';
import { Article } from '../types/articles.types';

export const readingListService = {
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

  async addToReadingList(articleId: number): Promise<void> {
    try {
      // Get the current user ID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error('User must be logged in to add to reading list');
      }

      // Get the current highest position
      const { data: positionData, error: positionError } = await supabase
        .from('reading_list')
        .select('position')
        .match({ user_id: user.id })
        .order('position', { ascending: false })
        .limit(1);

      if (positionError) throw positionError;

      // Calculate the next position
      const nextPosition =
        positionData && positionData.length > 0 ? positionData[0].position + 1 : 0;

      // Use upsert to add or update the article in the reading list
      const insertData = {
        user_id: user.id,
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
      throw error;
    }
  },

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
