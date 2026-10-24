import type { QueryData } from '@supabase/supabase-js';

import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { ArticleId } from '@/types/branded.types';
import { createServiceErrorConfigs } from '@/utils/serviceErrorConfig';
import { executeAuthenticatedQuery, type RequestOptions } from '@/utils/supabaseHelpers';

const errorConfig = {
  readingList: createServiceErrorConfigs('reading_list', {
    load: { toastMessage: STRINGS.FAILED_TO_LOAD_BOOKMARKS },
    add: { toastMessage: STRINGS.FAILED_TO_ADD_TO_READING_LIST },
    remove: { toastMessage: STRINGS.FAILED_TO_REMOVE_FROM_READING_LIST },
  }),
};

/** The reading list's unique key — what makes adding an already-saved article a no-op. */
const READING_LIST_CONFLICT_KEY = 'user_id,article_id';

export const bookmarkService = {
  /**
   * Adds an article to the reading list
   * @param userId - The user ID
   * @param articleId - The article ID to add to reading list
   */
  async addToReadingList(
    userId: string,
    articleId: ArticleId,
    request: RequestOptions = {},
  ): Promise<void> {
    await executeAuthenticatedQuery(
      userId,
      () =>
        supabase
          .from('reading_list')
          .upsert(
            { user_id: userId, article_id: articleId },
            { onConflict: READING_LIST_CONFLICT_KEY },
          ),
      {
        ...errorConfig.readingList.add,
        analyticsProperties: { articleId },
      },
      request,
    );
  },

  /**
   * Adds several articles to the reading list in ONE request.
   *
   * One upsert of every row rather than a request per article: it succeeds or
   * fails as a whole, so a failure is reported (and toasted) once instead of
   * once per article, and articles already in the list are left as they are.
   */
  async addManyToReadingList(
    userId: string,
    articleIds: readonly ArticleId[],
    request: RequestOptions = {},
  ): Promise<void> {
    if (articleIds.length === 0) return;

    await executeAuthenticatedQuery(
      userId,
      () =>
        supabase.from('reading_list').upsert(
          articleIds.map(articleId => ({ user_id: userId, article_id: articleId })),
          { onConflict: READING_LIST_CONFLICT_KEY },
        ),
      {
        ...errorConfig.readingList.add,
        analyticsProperties: { count: articleIds.length },
      },
      request,
    );
  },

  /**
   * Removes an article from the reading list
   */
  async removeFromReadingList(
    userId: string,
    articleId: ArticleId,
    request: RequestOptions = {},
  ): Promise<void> {
    await executeAuthenticatedQuery(
      userId,
      () =>
        supabase.from('reading_list').delete().eq('user_id', userId).eq('article_id', articleId),
      {
        ...errorConfig.readingList.remove,
        analyticsProperties: { articleId },
      },
      request,
    );
  },

  /**
   * Gets the user's reading list
   *
   * Also the one source of "is this article saved": the reader derives it from
   * this list's cache (`useArticleData`) instead of asking the server per article.
   */
  getReadingList(userId: string, request: RequestOptions = {}): Promise<BookmarkItem[]> {
    return executeAuthenticatedQuery(
      userId,
      () => readingListQuery(userId),
      errorConfig.readingList.load,
      request,
    );
  },
};

/**
 * The reading list, newest first, with each article in the shape the playlist
 * and the audio tracks read.
 */
function readingListQuery(userId: string) {
  return supabase
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
    .order('added_at', { ascending: false });
}

/**
 * One reading-list row, typed from the select above — supabase-js parses the
 * nested `articles!inner(...)` join into exactly this. It used to be a
 * hand-written type claiming a whole `Article` (branded ids, `published`,
 * `book`, full sentence rows), none of which the query selects, kept true only
 * by an `as` cast.
 */
export type BookmarkItem = QueryData<ReturnType<typeof readingListQuery>>[number];
