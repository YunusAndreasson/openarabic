'use client';

import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type UserStudyStats = Database['public']['Views']['user_study_stats']['Row'];

interface AggregatedStats {
  totalUsers: number;
  totalWords: number;
  dueWords: number;
  learningWords: number;
  masteredWords: number;
  avgWordsPerUser: number;
  avgDifficulty: number;
  avgStability: number;
  topUsers: Array<{
    user_id: string;
    total_words: number;
    due_words: number;
    mastered_words: number;
    avg_difficulty: number;
  }>;
}

interface UseUserStudyAnalyticsReturn {
  isLoading: boolean;
  stats: AggregatedStats;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUserStudyAnalytics(): UseUserStudyAnalyticsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AggregatedStats>({
    totalUsers: 0,
    totalWords: 0,
    dueWords: 0,
    learningWords: 0,
    masteredWords: 0,
    avgWordsPerUser: 0,
    avgDifficulty: 0,
    avgStability: 0,
    topUsers: [],
  });
  const [error, setError] = useState<string | null>(null);

  const fetchUserStudyStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the pre-built user_study_stats view
      const { data: userStats, error: statsError } = await supabaseAdmin
        .from('user_study_stats')
        .select('*')
        .order('total_words', { ascending: false });

      if (statsError) throw statsError;

      if (!userStats || userStats.length === 0) {
        setStats({
          totalUsers: 0,
          totalWords: 0,
          dueWords: 0,
          learningWords: 0,
          masteredWords: 0,
          avgWordsPerUser: 0,
          avgDifficulty: 0,
          avgStability: 0,
          topUsers: [],
        });
        return;
      }

      // Calculate aggregated statistics
      const totalUsers = userStats.length;
      const totalWords = userStats.reduce((sum, user) => sum + (user.total_words || 0), 0);
      const dueWords = userStats.reduce((sum, user) => sum + (user.due_words || 0), 0);
      const learningWords = userStats.reduce((sum, user) => sum + (user.learning_words || 0), 0);
      const masteredWords = userStats.reduce((sum, user) => sum + (user.mastered_words || 0), 0);

      const avgWordsPerUser = Math.round(totalWords / totalUsers);

      // Calculate average difficulty and stability
      const avgDifficulty =
        Math.round(
          (userStats.reduce((sum, user) => sum + (user.avg_difficulty || 0), 0) / totalUsers) * 100,
        ) / 100;

      const avgStability =
        Math.round(
          (userStats.reduce((sum, user) => sum + (user.avg_stability || 0), 0) / totalUsers) * 100,
        ) / 100;

      // Get top 10 users by total words
      const topUsers = userStats.slice(0, 10).map(user => ({
        user_id: user.user_id || 'Unknown',
        total_words: user.total_words || 0,
        due_words: user.due_words || 0,
        mastered_words: user.mastered_words || 0,
        avg_difficulty: Math.round((user.avg_difficulty || 0) * 100) / 100,
      }));

      setStats({
        totalUsers,
        totalWords,
        dueWords,
        learningWords,
        masteredWords,
        avgWordsPerUser,
        avgDifficulty,
        avgStability,
        topUsers,
      });
    } catch (err) {
      console.error('Error fetching user study stats:', err);
      setError('Failed to load user study analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    await fetchUserStudyStats();
  };

  useEffect(() => {
    fetchUserStudyStats();
  }, []);

  return {
    isLoading,
    stats,
    error,
    refresh,
  };
}
