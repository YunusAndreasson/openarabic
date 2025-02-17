import { supabase } from './supabase';

export const readingListService = {
  async addToReadingList(userId: string, articleId: number) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      throw new Error('No active session');
    }

    try {
      const positionQuery = await supabase
        .from('reading_list')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1);

      if (positionQuery.error) {
        throw positionQuery.error;
      }

      const newPosition = (positionQuery.data?.[0]?.position ?? 0) + 1;
      const insertData = {
        user_id: userId,
        article_id: articleId,
        position: newPosition,
        added_at: new Date().toISOString(),
        completed: false,
        read_count: 0,
      };

      const upsertQuery = await supabase.from('reading_list').upsert(insertData).select().single();

      if (upsertQuery.error) {
        throw upsertQuery.error;
      }

      return upsertQuery.data;
    } catch {
      throw new Error('Error adding to reading list');
    }
  },

  async removeFromReadingList(userId: string, articleId: number) {
    try {
      const { error } = await supabase
        .from('reading_list')
        .delete()
        .match({ user_id: userId, article_id: articleId });

      if (error) {
        throw error;
      }
    } catch {
      throw new Error('Error removing from reading list');
    }
  },

  async isInReadingList(userId: string, articleId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('reading_list')
        .select()
        .match({ user_id: userId, article_id: articleId })
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch {
      throw new Error('Error checking reading list status');
    }
  },

  async getReadingList(userId: string) {
    try {
      const { data, error } = await supabase
        .from('reading_list')
        .select(
          `
          *,
          article:articles(
            *,
            category:categories(*),
            author:authors(*)
          )
        `
        )
        .eq('user_id', userId)
        .order('position', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch {
      throw new Error('Error getting reading list');
    }
  },
};
