import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { ArticleId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';

const errorConfig = {
  update: createServiceErrorConfig('reading_progress', 'update', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    showToast: false,
  }),
  get: createServiceErrorConfig('reading_progress', 'fetch', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    showToast: false,
  }),
  bulkGet: createServiceErrorConfig('reading_progress', 'fetch', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    analyticsEventName: 'Reading_Progress_Bulk_Get_Error',
    showToast: false,
  }),
  byProgress: createServiceErrorConfig('reading_progress', 'fetch', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    analyticsEventName: 'Reading_Progress_By_Progress_Get_Error',
    showToast: false,
  }),
  lastRead: createServiceErrorConfig('last_read_article', 'fetch', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
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

export interface ReadingProgress {
  user_id: string;
  article_id: number;
  last_sentence_read: number;
  total_sentences: number;
  updated_at: string | null;
  created_at: string | null;
}

// Helper type for safe reading progress data with computed percentage
export interface SafeReadingProgress {
  user_id: string;
  article_id: number;
  last_sentence_read: number;
  total_sentences: number;
  progress_percentage: number; // Computed from last_sentence_read and total_sentences
  updated_at: string;
  created_at: string;
}

/**
 * Safely converts nullable ReadingProgress to SafeReadingProgress with defaults
 * Computes progress_percentage from last_sentence_read and total_sentences
 * @internal
 */
export function toSafeReadingProgress(
  progress: ReadingProgress | null,
): SafeReadingProgress | null {
  if (!progress) return null;

  return {
    ...progress,
    progress_percentage: calculateProgressPercentage(
      progress.last_sentence_read,
      progress.total_sentences,
    ),
    updated_at: progress.updated_at ?? progress.created_at ?? new Date().toISOString(),
    created_at: progress.created_at ?? new Date().toISOString(),
  };
}

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
  static async updateProgress({
    userId,
    articleId,
    lastSentenceRead,
    totalSentences,
  }: UpdateReadingProgressParams): Promise<void> {
    const progressData = {
      user_id: userId,
      article_id: articleId,
      last_sentence_read: lastSentenceRead,
      total_sentences: totalSentences,
      updated_at: new Date().toISOString(),
    };

    await executeQuery(
      () =>
        supabase.from('reading_progress').upsert(progressData, {
          onConflict: 'user_id,article_id',
        }),
      {
        ...errorConfig.update,
        analyticsProperties: { userId, articleId },
      },
    );
  }

  /**
   * Get reading progress for a specific article
   */
  static async getProgress(userId: string, articleId: ArticleId): Promise<ReadingProgress | null> {
    const data = await executeQuery(
      () =>
        supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('article_id', articleId)
          .maybeSingle(),
      {
        ...errorConfig.get,
        analyticsProperties: { userId, articleId },
      },
    );

    return data;
  }

  /**
   * Get safe reading progress for a specific article (with nulls handled)
   */
  static async getSafeProgress(
    userId: string,
    articleId: ArticleId,
  ): Promise<SafeReadingProgress | null> {
    const progress = await this.getProgress(userId, articleId);
    return toSafeReadingProgress(progress);
  }

  /**
   * Get reading progress for multiple articles
   * @param userId - The user ID to fetch progress for
   * @param articleIds - Array of article IDs to fetch. If empty, fetches ALL progress for user.
   */
  static async getBulkProgress(
    userId: string,
    articleIds: ArticleId[],
  ): Promise<Map<ArticleId, ReadingProgress>> {
    // Build query
    let query = supabase.from('reading_progress').select('*').eq('user_id', userId);

    // Only filter by articleIds if provided
    if (articleIds.length > 0) {
      query = query.in('article_id', articleIds);
    }

    const data = await executeQuery(() => query, {
      ...errorConfig.bulkGet,
      analyticsProperties: { userId, count: articleIds.length },
    });

    // Convert to Map for easy lookup
    const progressMap = new Map<ArticleId, ReadingProgress>();
    (data as Tables<'reading_progress'>[]).forEach(progress => {
      progressMap.set(progress.article_id as ArticleId, progress);
    });

    return progressMap;
  }

  /**
   * Get safe reading progress for multiple articles (with nulls handled)
   */
  static async getBulkSafeProgress(
    userId: string,
    articleIds: ArticleId[],
  ): Promise<Map<ArticleId, SafeReadingProgress>> {
    const progressMap = await this.getBulkProgress(userId, articleIds);
    const safeProgressMap = new Map<ArticleId, SafeReadingProgress>();

    progressMap.forEach((progress, articleId) => {
      const safeProgress = toSafeReadingProgress(progress);
      if (safeProgress) {
        safeProgressMap.set(articleId, safeProgress);
      }
    });

    return safeProgressMap;
  }

  /**
   * Get articles sorted by reading progress
   * Note: Sorting is done in code since progress_percentage is computed, not stored
   */
  static async getArticlesByProgress(
    userId: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<ReadingProgress[]> {
    const data = await executeQuery(
      () => supabase.from('reading_progress').select('*').eq('user_id', userId),
      {
        ...errorConfig.byProgress,
        analyticsProperties: { userId, sortOrder },
      },
    );

    const progressList = (data as Tables<'reading_progress'>[]).map(row => row as ReadingProgress);

    // Sort by calculated progress percentage
    return progressList.sort((a, b) => {
      const percentA = calculateProgressPercentage(a.last_sentence_read, a.total_sentences);
      const percentB = calculateProgressPercentage(b.last_sentence_read, b.total_sentences);
      return sortOrder === 'asc' ? percentA - percentB : percentB - percentA;
    });
  }

  /**
   * Get articles sorted by reading progress (with nulls handled)
   */
  static async getArticlesBySafeProgress(
    userId: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<SafeReadingProgress[]> {
    const progressData = await this.getArticlesByProgress(userId, sortOrder);
    return progressData
      .map(p => toSafeReadingProgress(p))
      .filter((p): p is SafeReadingProgress => p !== null);
  }

  /**
   * Get the most recently read article for a user
   */
  static async getLastReadArticle(userId: string): Promise<ReadingProgress | null> {
    const data = await executeQuery(
      () =>
        supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', userId)
          .gt('last_sentence_read', 0) // Only articles with actual progress
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      {
        ...errorConfig.lastRead,
        analyticsProperties: { userId },
      },
    );

    return data;
  }

  /**
   * Delete all reading progress for a user
   * This removes all reading positions and progress percentages
   * If DELETE is blocked by RLS, falls back to resetting progress to 0
   */
  static async deleteAllProgress(userId: string): Promise<void> {
    // First attempt: DELETE all rows
    const deleteResult = await executeQuery(
      () => supabase.from('reading_progress').delete().eq('user_id', userId).select(),
      {
        ...errorConfig.deleteAll,
        analyticsProperties: { userId },
      },
    );

    // Verify rows were actually deleted
    if (!deleteResult || (Array.isArray(deleteResult) && deleteResult.length === 0)) {
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
            .eq('user_id', userId)
            .select(),
        {
          ...errorConfig.resetUpdate,
          analyticsProperties: { userId },
        },
      );
    }
  }
}

export const readingProgressService = ReadingProgressService;
