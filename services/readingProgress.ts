import { supabase } from '@/services/supabase';
import type { Database } from '@/types/database.types';

type ReadingProgressRow = Database['public']['Tables']['reading_progress']['Row'];

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
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get reading progress: ${error.message}`);
    }

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
   */
  static async getBulkProgress(
    userId: string,
    articleIds: number[]
  ): Promise<Map<number, ReadingProgress>> {
    if (articleIds.length === 0) {
      return new Map();
    }

    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .in('article_id', articleIds);

    if (error) {
      throw new Error(`Failed to get bulk reading progress: ${error.message}`);
    }

    // Convert to Map for easy lookup
    const progressMap = new Map<number, ReadingProgress>();
    (data as ReadingProgressRow[]).forEach(progress => {
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
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .order('progress_percentage', { ascending: sortOrder === 'asc' });

    if (error) {
      throw new Error(`Failed to get articles by progress: ${error.message}`);
    }

    return (data as ReadingProgressRow[]).map(row => row as ReadingProgress);
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
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .gt('last_sentence_read', 0) // Only articles with actual progress
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get last read article: ${error.message}`);
    }

    return data as ReadingProgress | null;
  }

  /**
   * Get the 10 most recently read articles with article data for a user
   * Efficient implementation with two separate queries for reliability
   */
  static async getLatestReadArticles(
    userId: string,
    limit: number = 10
  ): Promise<(ReadingProgress & { articles: any })[]> {
    // First get the reading progress entries
    const { data: progressData, error: progressError } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .gt('last_sentence_read', 0) // Only articles with actual progress
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (progressError) {
      throw new Error(`Failed to get latest read articles: ${progressError.message}`);
    }

    if (!progressData || progressData.length === 0) {
      return [];
    }

    // Get the article IDs
    const articleIds = progressData.map(p => p.article_id);

    // Fetch the article details
    const { data: articlesData, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, summary, image_url, author_id, category_id, difficulty_level')
      .in('id', articleIds);

    if (articlesError) {
      throw new Error(`Failed to get article details: ${articlesError.message}`);
    }

    // Combine the data
    const result = progressData.map(progress => {
      const article = articlesData?.find(a => a.id === progress.article_id);
      return {
        ...progress,
        articles: article || null,
      };
    });

    return result;
  }
}

export const readingProgressService = ReadingProgressService;
