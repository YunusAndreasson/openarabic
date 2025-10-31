import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { BookmarkItem } from '@/types/bookmark.types';
import { executeAuthenticatedQuery } from '@/utils/supabaseHelpers';

const errorConfig = {
  readingList: {
    load: {
      toastMessage: STRINGS.FAILED_TO_LOAD_BOOKMARKS,
      analyticsEventName: 'Reading_List_Load_Error',
      sentrySeverity: 'error' as const,
    },
    add: {
      toastMessage: STRINGS.FAILED_TO_ADD_TO_READING_LIST,
      analyticsEventName: 'Reading_List_Add_Error',
      sentrySeverity: 'error' as const,
    },
    remove: {
      toastMessage: STRINGS.FAILED_TO_REMOVE_FROM_READING_LIST,
      analyticsEventName: 'Reading_List_Remove_Error',
      sentrySeverity: 'error' as const,
    },
    check: {
      toastMessage: STRINGS.FAILED_TO_CHECK_READING_LIST_STATUS,
      analyticsEventName: 'Reading_List_Check_Error',
      sentrySeverity: 'warning' as const,
      showToast: false,
    },
  },
};

export const bookmarkService = {
  /**
   * Adds an article to the reading list
   * @param userId - The user ID
   * @param articleId - The article ID to add to reading list
   */
  async addToReadingList(userId: string, articleId: number): Promise<void> {
    await executeAuthenticatedQuery(
      userId,
      () =>
        supabase
          .from('reading_list')
          .upsert({ user_id: userId, article_id: articleId }, { onConflict: 'user_id,article_id' }),
      {
        ...errorConfig.readingList.add,
        analyticsProperties: { articleId },
      },
    );
  },

  /**
   * Removes an article from the reading list
   */
  async removeFromReadingList(userId: string, articleId: number): Promise<void> {
    await executeAuthenticatedQuery(
      userId,
      () =>
        supabase.from('reading_list').delete().eq('user_id', userId).eq('article_id', articleId),
      {
        ...errorConfig.readingList.remove,
        analyticsProperties: { articleId },
      },
    );
  },

  /**
   * Checks if an article is in the user's reading list
   */
  async isInReadingList(userId: string, articleId: number): Promise<boolean> {
    try {
      const data = await executeAuthenticatedQuery(
        userId,
        () =>
          supabase
            .from('reading_list')
            .select('article_id')
            .eq('user_id', userId)
            .eq('article_id', articleId)
            .single(),
        {
          ...errorConfig.readingList.check,
          analyticsProperties: { articleId },
        },
      );
      return Boolean(data);
    } catch (error) {
      // PGRST116 = "not found" error from Supabase, which is expected behavior
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }
  },

  /**
   * Gets the user's reading list
   */
  async getReadingList(userId: string): Promise<BookmarkItem[]> {
    const data = await executeAuthenticatedQuery(
      userId,
      () =>
        supabase
          .from('reading_list')
          .select(
            `
        user_id,
        article_id,
        added_at,
        articles!inner (
          id,
          title,
          author_id,
          category_id,
          content_hash,
          audio_url,
          audio_url_bilingual,
          image_url,
          summary,
          difficulty_level,
          created_at,
          category:categories(id, name),
          author:authors(id, name)
        )
      `,
          )
          .eq('user_id', userId)
          .order('added_at', { ascending: false }),
      errorConfig.readingList.load,
    );

    return (data ?? []) as BookmarkItem[];
  },

  async getArticleIds(userId: string): Promise<number[]> {
    const data = await executeAuthenticatedQuery(
      userId,
      () => supabase.from('reading_list').select('article_id').eq('user_id', userId),
      errorConfig.readingList.load,
    );

    return (data ?? []).map(item => item.article_id);
  },
};
