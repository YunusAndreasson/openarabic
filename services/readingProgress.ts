import type { Database } from '@/types/database.types';

import { supabase } from './supabase';

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
}

export const readingProgressService = ReadingProgressService;
