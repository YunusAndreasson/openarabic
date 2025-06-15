import type { Article } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';

import { supabase, checkAuthentication } from './supabase';

type ReadingListItem = {
  user_id: string;
  article_id: number;
  category_id: number | null;
  added_at: string;
  articles: Article & {
    author: {
      id: number;
      name: string;
    };
  };
};

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

export const readingListService = {
  /**
   * Adds an article to the reading list
   * @param userId - The user ID
   * @param articleId - The article ID to add to reading list
   */
  async addToReadingList(userId: string, articleId: number): Promise<void> {
    await checkAuthentication(userId);

    const { error } = await supabase
      .from('reading_list')
      .upsert({ user_id: userId, article_id: articleId }, { onConflict: 'user_id,article_id' });

    if (error) {
      await handleError(error, {
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
    await checkAuthentication(userId);
    const { error } = await supabase
      .from('reading_list')
      .delete()
      .eq('user_id', userId)
      .eq('article_id', articleId);

    if (error) {
      await handleError(error, {
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
    await checkAuthentication(userId);
    const { data, error } = await supabase
      .from('reading_list')
      .select('article_id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      await handleError(error, {
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
        user_id,
        article_id,
        added_at,
        category_id,
        articles!inner (
          id,
          title,
          author_id,
          category_id,
          content_hash,
          audio_url,
          image_url,
          summary,
          difficulty_level,
          created_at,
          category:categories(id, name),
          author:authors(id, name)
        )
      `
      )
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ReadingListItem[];
  },

  async getArticleIds(userId: string): Promise<number[]> {
    const { data, error } = await supabase
      .from('reading_list')
      .select('article_id')
      .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map(item => item.article_id);
  },
};
