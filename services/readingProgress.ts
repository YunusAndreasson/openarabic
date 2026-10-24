import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { ArticleId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import {
  executeCountQuery,
  executeQuery,
  fetchAllPages,
  type RequestOptions,
} from '@/utils/supabaseHelpers';

const errorConfig = {
  update: createServiceErrorConfig('reading_progress', 'update', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    showToast: false,
  }),
  bulkGet: createServiceErrorConfig('reading_progress', 'fetch', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    analyticsEventName: 'Reading_Progress_Bulk_Get_Error',
    showToast: false,
  }),
  deleteAll: createServiceErrorConfig('reading_progress', 'delete', {
    toastMessage: STRINGS.FAILED_TO_RESET_READING_PROGRESS,
    analyticsEventName: 'Reading_Progress_Delete_All_Error',
    showToast: false,
  }),
  resetUpdate: createServiceErrorConfig('reading_progress', 'update', {
    toastMessage: STRINGS.FAILED_TO_RESET_READING_PROGRESS,
    analyticsEventName: 'Reading_Progress_Reset_Update_Error',
    showToast: false,
  }),
};

/**
 * A `reading_progress` row, as read.
 *
 * Read off the generated schema rather than listed by hand. The hand-written
 * copy had drifted already: it omitted the table's `progress_percentage`
 * column entirely, so nothing in the app could see that the column exists — and
 * a renamed or re-typed column elsewhere in the row would have kept compiling
 * against a shape the database no longer has.
 */
export type ReadingProgress = Tables<'reading_progress'>;

interface UpdateReadingProgressParams {
  userId: string;
  articleId: ArticleId;
  lastSentenceRead: number;
  totalSentences: number;
}

export class ReadingProgressService {
  /**
   * Update reading progress for a user and article
   * Note: progress_percentage is calculated in code, not stored in database
   */
  static async updateProgress(
    { userId, articleId, lastSentenceRead, totalSentences }: UpdateReadingProgressParams,
    request: RequestOptions = {},
  ): Promise<void> {
    await executeQuery(
      () =>
        supabase.rpc('update_reading_progress_monotonic', {
          p_user_id: userId,
          p_article_id: articleId,
          p_last_sentence_read: lastSentenceRead,
          p_total_sentences: totalSentences,
        }),
      {
        ...errorConfig.update,
        analyticsProperties: { userId, articleId },
      },
      request,
    );
  }

  /**
   * Every reading-progress row for a user, keyed by article.
   *
   * Paged, ordered by `article_id` — unique per user — so no page can repeat or
   * drop a row: PostgREST truncates a response at 1000 rows without saying so.
   */
  static async getBulkProgress(
    userId: string,
    request: RequestOptions = {},
  ): Promise<Map<ArticleId, ReadingProgress>> {
    const rows = await fetchAllPages(
      (from, to, signal) =>
        supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', userId)
          .order('article_id')
          .range(from, to)
          .abortSignal(signal),
      { errorConfig: { ...errorConfig.bulkGet, analyticsProperties: { userId } }, request },
    );

    // Convert to Map for easy lookup
    const progressMap = new Map<ArticleId, ReadingProgress>();
    rows.forEach(progress => {
      progressMap.set(progress.article_id as ArticleId, progress);
    });

    return progressMap;
  }

  /**
   * Delete all reading progress for a user
   * This removes all reading positions and progress percentages
   * If DELETE is blocked by RLS, falls back to resetting progress to 0
   */
  static async deleteAllProgress(userId: string): Promise<void> {
    // First attempt: DELETE all rows. Counted, not returned: the rows themselves
    // were only ever read to see whether there were any.
    const deletedCount = await executeCountQuery(
      () => supabase.from('reading_progress').delete({ count: 'exact' }).eq('user_id', userId),
      {
        ...errorConfig.deleteAll,
        analyticsProperties: { userId },
      },
    );

    // Verify rows were actually deleted
    if (deletedCount === 0) {
      // No rows deleted - likely RLS policy blocking DELETE
      // Fallback: UPDATE all progress to -1 to represent "no progress"
      // Note: -1 is treated as 0% in calculateProgressPercentage
      if (__DEV__) {
        console.warn(
          '[ReadingProgress] DELETE blocked, attempting UPDATE fallback to reset progress to -1 (0%)',
        );
      }

      await executeQuery(
        () =>
          supabase
            .from('reading_progress')
            .update({ last_sentence_read: -1 })
            .eq('user_id', userId),
        {
          ...errorConfig.resetUpdate,
          analyticsProperties: { userId },
        },
      );
    }
  }
}

export const readingProgressService = ReadingProgressService;
