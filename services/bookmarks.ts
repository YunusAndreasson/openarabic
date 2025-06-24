import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';

import { checkAuthentication, supabase } from './supabase';

const errorConfig = {
  bookmarks: {
    load: {
      toastMessage: STRINGS.FAILED_TO_LOAD_BOOKMARKS,
      analyticsEventName: 'Bookmarks_Load_Error',
      sentrySeverity: 'error' as const,
    },
    add: {
      toastMessage: STRINGS.FAILED_TO_ADD_BOOKMARK,
      analyticsEventName: 'Bookmarks_Add_Error',
      sentrySeverity: 'error' as const,
    },
    remove: {
      toastMessage: STRINGS.FAILED_TO_REMOVE_BOOKMARK,
      analyticsEventName: 'Bookmarks_Remove_Error',
      sentrySeverity: 'error' as const,
    },
    check: {
      toastMessage: STRINGS.FAILED_TO_CHECK_BOOKMARK_STATUS,
      analyticsEventName: 'Bookmarks_Check_Error',
      sentrySeverity: 'warning' as const,
      showToast: false,
    },
  },
};

export const bookmarkService = {
  /**
   * Adds an article to bookmarks
   */
  async addBookmark(userId: string, articleId: number): Promise<void> {
    await checkAuthentication(userId);

    const { error } = await supabase
      .from('bookmarks')
      .upsert({ user_id: userId, article_id: articleId }, { onConflict: 'user_id,article_id' });

    if (error) {
      await handleError(error, {
        ...errorConfig.bookmarks.add,
        analyticsProperties: { articleId },
      });
      throw error;
    }
  },

  /**
   * Removes an article from bookmarks
   */
  async removeBookmark(userId: string, articleId: number): Promise<void> {
    await checkAuthentication(userId);
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('article_id', articleId);

    if (error) {
      await handleError(error, {
        ...errorConfig.bookmarks.remove,
        analyticsProperties: { articleId },
      });
      throw error;
    }
  },

  /**
   * Checks if an article is bookmarked
   */
  async isBookmarked(userId: string, articleId: number): Promise<boolean> {
    await checkAuthentication(userId);
    const { data, error } = await supabase
      .from('bookmarks')
      .select('article_id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      await handleError(error, {
        ...errorConfig.bookmarks.check,
        analyticsProperties: { articleId },
      });
      throw error;
    }

    return !!data;
  },

  /**
   * Gets bookmarked articles for filtering
   */
  async getBookmarkedArticles(userId: string): Promise<Article[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(
        `
        article_id,
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

    // Transform to Article[] format for consistency with filter system
    return (data ?? []).map(item => item.articles as Article);
  },

  /**
   * Gets bookmark count for a user
   */
  async getBookmarkCount(userId: string): Promise<number> {
    await checkAuthentication(userId);
    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      await handleError(error, {
        ...errorConfig.bookmarks.load,
        analyticsProperties: { userId },
      });
      return 0;
    }

    return count ?? 0;
  },
};
