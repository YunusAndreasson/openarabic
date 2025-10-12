import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database.types';
import { executeQuery } from '@/utils/supabaseHelpers';

export interface ReadingProgress {
  user_id: string;
  article_id: number;
  last_sentence_read: number;
  total_sentences: number;
  progress_percentage: number | null;
  updated_at: string | null;
  created_at: string | null;
}

// Helper type for safe reading progress data
export interface SafeReadingProgress {
  user_id: string;
  article_id: number;
  last_sentence_read: number;
  total_sentences: number;
  progress_percentage: number;
  updated_at: string;
  created_at: string;
}

/**
 * Safely converts nullable ReadingProgress to SafeReadingProgress with defaults
 */
export function toSafeReadingProgress(
  progress: ReadingProgress | null
): SafeReadingProgress | null {
  if (!progress) return null;

  return {
    ...progress,
    progress_percentage: progress.progress_percentage ?? 0,
    updated_at: progress.updated_at ?? progress.created_at ?? new Date().toISOString(),
    created_at: progress.created_at ?? new Date().toISOString(),
  };
}

interface UpdateReadingProgressParams {
  userId: string;
  articleId: number;
  lastSentenceRead: number;
  totalSentences: number;
}

export class ReadingProgressService {
  /**
   * Update reading progress for a user and article
   */
  static async updateProgress({
    userId,
    articleId,
    lastSentenceRead,
    totalSentences,
  }: UpdateReadingProgressParams): Promise<void> {
    const { error } = await supabase.rpc('upsert_reading_progress', {
      p_user_id: userId,
      p_article_id: articleId,
      p_last_sentence_read: lastSentenceRead,
      p_total_sentences: totalSentences,
    });

    if (error) {
      throw new Error(`Failed to update reading progress: ${error.message}`);
    }
  }

  /**
   * Get reading progress for a specific article
   */
  static async getProgress(userId: string, articleId: number): Promise<ReadingProgress | null> {
    const data = await executeQuery(
      () =>
        supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('article_id', articleId)
          .maybeSingle(),
      {
        toastMessage: STRINGS.ERROR_LOADING_DATA,
        analyticsEventName: 'Reading_Progress_Get_Error',
        analyticsProperties: { userId, articleId },
        showToast: false, // Silent error for reading progress
      }
    );

    return data as ReadingProgress | null;
  }

  /**
   * Get safe reading progress for a specific article (with nulls handled)
   */
  static async getSafeProgress(
    userId: string,
    articleId: number
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
    articleIds: number[]
  ): Promise<Map<number, ReadingProgress>> {
    // Build query
    let query = supabase.from('reading_progress').select('*').eq('user_id', userId);

    // Only filter by articleIds if provided
    if (articleIds.length > 0) {
      query = query.in('article_id', articleIds);
    }

    const data = await executeQuery(() => query, {
      toastMessage: STRINGS.ERROR_LOADING_DATA,
      analyticsEventName: 'Reading_Progress_Bulk_Get_Error',
      analyticsProperties: { userId, count: articleIds.length },
      showToast: false, // Silent error for reading progress
    });

    // Convert to Map for easy lookup
    const progressMap = new Map<number, ReadingProgress>();
    (data as Tables<'reading_progress'>[]).forEach(progress => {
      progressMap.set(progress.article_id, progress as ReadingProgress);
    });

    return progressMap;
  }

  /**
   * Get safe reading progress for multiple articles (with nulls handled)
   */
  static async getBulkSafeProgress(
    userId: string,
    articleIds: number[]
  ): Promise<Map<number, SafeReadingProgress>> {
    const progressMap = await this.getBulkProgress(userId, articleIds);
    const safeProgressMap = new Map<number, SafeReadingProgress>();

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
   */
  static async getArticlesByProgress(
    userId: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<ReadingProgress[]> {
    const data = await executeQuery(
      () =>
        supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', userId)
          .order('progress_percentage', { ascending: sortOrder === 'asc' }),
      {
        toastMessage: STRINGS.ERROR_LOADING_DATA,
        analyticsEventName: 'Reading_Progress_By_Progress_Get_Error',
        analyticsProperties: { userId, sortOrder },
        showToast: false,
      }
    );

    return (data as Tables<'reading_progress'>[]).map(row => row as ReadingProgress);
  }

  /**
   * Get articles sorted by reading progress (with nulls handled)
   */
  static async getArticlesBySafeProgress(
    userId: string,
    sortOrder: 'asc' | 'desc' = 'asc'
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
        toastMessage: STRINGS.ERROR_LOADING_DATA,
        analyticsEventName: 'Last_Read_Article_Get_Error',
        analyticsProperties: { userId },
        showToast: false,
      }
    );

    return data as ReadingProgress | null;
  }
}

export const readingProgressService = ReadingProgressService;
