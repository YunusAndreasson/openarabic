import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { ArticleId } from '@/types/branded.types';
import type { BookmarkItem } from '@/types/bookmark.types';
import { createServiceErrorConfigs } from '@/utils/serviceErrorConfig';
import { executeAuthenticatedQuery } from '@/utils/supabaseHelpers';

const errorConfig = {
  readingList: createServiceErrorConfigs('reading_list', {
    load: { toastMessage: STRINGS.FAILED_TO_LOAD_BOOKMARKS },
    add: { toastMessage: STRINGS.FAILED_TO_ADD_TO_READING_LIST },
    remove: { toastMessage: STRINGS.FAILED_TO_REMOVE_FROM_READING_LIST },
    check: {
      toastMessage: STRINGS.FAILED_TO_CHECK_READING_LIST_STATUS,
      showToast: false,
    },
  }),
};

export const bookmarkService = {
  /**
   * Adds an article to the reading list
   * @param userId - The user ID
   * @param articleId - The article ID to add to reading list
   */
  async addToReadingList(userId: string, articleId: ArticleId): Promise<void> {
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
  async removeFromReadingList(userId: string, articleId: ArticleId): Promise<void> {
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
  async isInReadingList(userId: string, articleId: ArticleId): Promise<boolean> {
    try {
      const data = await executeAuthenticatedQuery(
        userId,
        () =>
          supabase
            .from('reading_list')
            .select('article_id')
            .eq('user_id', userId)
            .eq('article_id', articleId)
            .maybeSingle(),
        {
          ...errorConfig.readingList.check,
          analyticsProperties: { articleId },
        },
      );
      return Boolean(data);
    } catch (error) {
      // PGRST116 = "not found" error from Supabase (shouldn't happen with maybeSingle, but kept for safety)
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
          author:authors(id, name),
          article_sentences(id)
        )
      `,
          )
          .eq('user_id', userId)
          .order('added_at', { ascending: false }),
      errorConfig.readingList.load,
    );

    // The nested `articles!inner(...)` join is beyond what the generated types
    // express, so the shape is asserted here. `.overrideTypes<BookmarkItem[]>()`
    // on the query (as `articlesService.getArticles` uses) reads tidier, but it
    // is the same unchecked override one step earlier — no more checking, and a
    // runtime method the query mocks would have to grow. Not worth the churn.
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
