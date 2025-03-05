import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { Article } from '../types/articles.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export const readingListService = {
  async getInProgressArticles(): Promise<Article[]> {
    // Get the current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching reading list:', error);
      throw error;
    }

    // Extract the articles from the nested structure
    const articles = data
      .filter(item => item.articles) // Filter out any null articles
      .map(item => item.articles as Article);

    return articles;
  },

  async addToReadingList(articleId: number): Promise<void> {
    // Get the current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be logged in to add to reading list');
    }

    // Get the current highest position
    const { data: positionData, error: positionError } = await supabase
      .from('reading_list')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1);

    if (positionError) {
      throw positionError;
    }

    // Calculate the next position
    const nextPosition = positionData.length > 0 ? positionData[0].position + 1 : 0;

    // Add the article to the reading list
    const { error } = await supabase.from('reading_list').insert({
      user_id: user.id,
      article_id: articleId,
      position: nextPosition,
      completed: false,
      read_count: 0,
      added_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  },

  async markAsCompleted(articleId: number): Promise<void> {
    // Get the current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be logged in to update reading list');
    }

    // Update the article in the reading list
    const { error } = await supabase
      .from('reading_list')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('article_id', articleId);

    if (error) {
      throw error;
    }
  },

  async incrementReadCount(articleId: number): Promise<void> {
    // Get the current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be logged in to update reading list');
    }

    // Get the current read count
    const { data, error: fetchError } = await supabase
      .from('reading_list')
      .select('read_count')
      .eq('user_id', user.id)
      .eq('article_id', articleId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Increment the read count
    const { error } = await supabase
      .from('reading_list')
      .update({
        read_count: (data?.read_count || 0) + 1,
      })
      .eq('user_id', user.id)
      .eq('article_id', articleId);

    if (error) {
      throw error;
    }
  },
};
