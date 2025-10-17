'use client';

import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Root = Database['public']['Tables']['roots']['Row'];
type StudyWord = Database['public']['Tables']['study_words']['Row'];
type Review = Database['public']['Tables']['reviews']['Row'];

interface HardWord {
  root_letters: string;
  root_meaning: string;
  total_reviews: number;
  avg_difficulty: number;
  avg_lapses: number;
  avg_grade: number;
  user_count: number;
}

interface UseHardWordsAnalyticsReturn {
  isLoading: boolean;
  hardWords: HardWord[];
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHardWordsAnalytics(): UseHardWordsAnalyticsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hardWords, setHardWords] = useState<HardWord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchHardWords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all roots
      console.log('Fetching roots...');
      const { data: roots, error: rootsError } = await supabaseAdmin
        .from('roots')
        .select('id, letters, meaning');

      if (rootsError) {
        console.error('Error fetching roots:', rootsError);
        throw new Error(`Failed to fetch roots: ${rootsError.message}`);
      }
      console.log(`Fetched ${roots?.length || 0} roots`);

      // Fetch all study_words with their FSRS data (by root_id)
      console.log('Fetching study_words...');
      const { data: studyWords, error: studyError } = await supabaseAdmin
        .from('study_words')
        .select('root_id, fsrs_difficulty, fsrs_lapses, user_id');

      if (studyError) {
        console.error('Error fetching study_words:', studyError);
        throw new Error(`Failed to fetch study_words: ${studyError.message}`);
      }
      console.log(`Fetched ${studyWords?.length || 0} study words`);

      // Count how many have difficulty data
      const wordsWithDifficulty = studyWords?.filter(w => w.fsrs_difficulty !== null) || [];
      console.log(`Words with difficulty: ${wordsWithDifficulty.length}`);

      // Fetch reviews data to calculate average grades (by root_id)
      console.log('Fetching reviews...');
      const { data: reviews, error: reviewsError } = await supabaseAdmin
        .from('reviews')
        .select('root_id, grade');

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        throw new Error(`Failed to fetch reviews: ${reviewsError.message}`);
      }
      console.log(`Fetched ${reviews?.length || 0} reviews`);

      // Create a map of root_id to root info
      const rootsMap = new Map<number, { letters: string; meaning: string }>();
      roots?.forEach((root) => {
        rootsMap.set(root.id, { letters: root.letters, meaning: root.meaning });
      });

      // Create a map of root_id to review grades
      const reviewGradesMap = new Map<number, number[]>();
      reviews?.forEach((review) => {
        if (!reviewGradesMap.has(review.root_id)) {
          reviewGradesMap.set(review.root_id, []);
        }
        reviewGradesMap.get(review.root_id)!.push(review.grade);
      });

      // Aggregate data by root_id (only for words with difficulty data)
      const rootStatsMap = new Map<number, {
        difficulties: number[];
        lapses: number[];
        userIds: Set<string>;
      }>();

      studyWords?.forEach((word) => {
        // Skip words without difficulty data
        if (word.fsrs_difficulty === null) return;

        if (!rootStatsMap.has(word.root_id)) {
          rootStatsMap.set(word.root_id, {
            difficulties: [],
            lapses: [],
            userIds: new Set(),
          });
        }
        const stats = rootStatsMap.get(word.root_id)!;
        stats.difficulties.push(word.fsrs_difficulty);
        if (word.fsrs_lapses !== null) {
          stats.lapses.push(word.fsrs_lapses);
        }
        stats.userIds.add(word.user_id);
      });

      console.log(`Aggregated stats for ${rootStatsMap.size} unique roots`);

      // Convert to HardWord array with calculated averages
      const hardWordsArray: HardWord[] = [];
      rootStatsMap.forEach((stats, root_id) => {
        const rootInfo = rootsMap.get(root_id);
        if (!rootInfo) return;

        const grades = reviewGradesMap.get(root_id) || [];
        const avgDifficulty = stats.difficulties.length > 0
          ? stats.difficulties.reduce((sum, d) => sum + d, 0) / stats.difficulties.length
          : 0;
        const avgLapses = stats.lapses.length > 0
          ? stats.lapses.reduce((sum, l) => sum + l, 0) / stats.lapses.length
          : 0;
        const avgGrade = grades.length > 0
          ? grades.reduce((sum, g) => sum + g, 0) / grades.length
          : 0;

        hardWordsArray.push({
          root_letters: rootInfo.letters,
          root_meaning: rootInfo.meaning,
          total_reviews: grades.length,
          avg_difficulty: Math.round(avgDifficulty * 100) / 100,
          avg_lapses: Math.round(avgLapses * 100) / 100,
          avg_grade: Math.round(avgGrade * 100) / 100,
          user_count: stats.userIds.size,
        });
      });

      // Sort by difficulty (desc), then lapses (desc), then grade (asc)
      hardWordsArray.sort((a, b) => {
        if (b.avg_difficulty !== a.avg_difficulty) {
          return b.avg_difficulty - a.avg_difficulty;
        }
        if (b.avg_lapses !== a.avg_lapses) {
          return b.avg_lapses - a.avg_lapses;
        }
        return a.avg_grade - b.avg_grade;
      });

      console.log(`Total hard words found: ${hardWordsArray.length}`);
      console.log(`Top 3 hardest roots:`, hardWordsArray.slice(0, 3));

      // Take top 50 hardest roots
      setHardWords(hardWordsArray.slice(0, 50));
    } catch (err) {
      console.error('Error fetching hard words:', err);
      setError('Failed to load hard words analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    await fetchHardWords();
  };

  useEffect(() => {
    fetchHardWords();
  }, []);

  return {
    isLoading,
    hardWords,
    error,
    refresh,
  };
}
