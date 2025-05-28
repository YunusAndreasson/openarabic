import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';

export interface WordStatsData {
  totalReviews: number;
  averageStability: number;
  averageDifficulty: number;
  masteryLevel: 'New' | 'Learning' | 'Review' | 'Mastered';
  daysSinceLastReview: number | null;
  successRate: number;
  successStreak: number;
}

interface StudyWordData {
  fsrs_reps: number | null;
  fsrs_stability: number | null;
  fsrs_difficulty: number | null;
  fsrs_state: number | null;
  fsrs_last_review: string | null;
  fsrs_lapses: number | null;
}

interface ReviewData {
  grade: number;
  reviewed_at: string;
}

export function useWordStats(rootId: number | null, wordId: number | null) {
  const { user } = useAuth();
  const [studyWordData, setStudyWordData] = useState<StudyWordData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || (!rootId && !wordId)) {
      setStudyWordData(null);
      setReviewData([]);
      return;
    }

    const fetchWordStats = async () => {
      setIsLoading(true);
      try {
        // Import supabase dynamically to avoid circular dependencies
        const { supabase } = await import('@/services/supabase');

        // Determine which ID to use for queries
        const queryRootId = rootId || (wordId ? await getWordRootId(wordId) : null);

        if (!queryRootId) {
          setStudyWordData(null);
          setReviewData([]);
          return;
        }

        // Fetch study word data
        const { data: studyWord } = await supabase
          .from('study_words')
          .select(
            'fsrs_reps, fsrs_stability, fsrs_difficulty, fsrs_state, fsrs_last_review, fsrs_lapses'
          )
          .eq('user_id', user.id)
          .eq('root_id', queryRootId)
          .single();

        setStudyWordData(studyWord);

        // Fetch review history
        const { data: reviews } = await supabase
          .from('reviews')
          .select('grade, reviewed_at')
          .eq('user_id', user.id)
          .eq('root_id', queryRootId)
          .order('reviewed_at', { ascending: false })
          .limit(50);

        setReviewData(reviews || []);
      } catch (error) {
        console.error('Error fetching word stats:', error);
        setStudyWordData(null);
        setReviewData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWordStats();
  }, [user?.id, rootId, wordId]);

  // Helper function to get root_id from word_id
  const getWordRootId = async (wordId: number): Promise<number | null> => {
    try {
      const { supabase } = await import('@/services/supabase');
      const { data } = await supabase
        .from('sentence_words')
        .select('root_id')
        .eq('id', wordId)
        .single();

      return data?.root_id || null;
    } catch {
      return null;
    }
  };

  // Calculate statistics from the fetched data
  const stats: WordStatsData = useMemo(() => {
    if (!studyWordData) {
      return {
        totalReviews: 0,
        averageStability: 0,
        averageDifficulty: 0.3, // Default FSRS difficulty
        masteryLevel: 'New',
        daysSinceLastReview: null,
        successRate: 0,
        successStreak: 0,
      };
    }

    const totalReviews = studyWordData.fsrs_reps || 0;
    const stability = studyWordData.fsrs_stability || 0;
    const difficulty = studyWordData.fsrs_difficulty || 0.3;
    const state = studyWordData.fsrs_state || 0;
    const lastReview = studyWordData.fsrs_last_review;
    const lapses = studyWordData.fsrs_lapses || 0;

    // Calculate mastery level based on FSRS state and stability
    let masteryLevel: 'New' | 'Learning' | 'Review' | 'Mastered' = 'New';
    if (state === 0) {
      masteryLevel = 'New';
    } else if (state === 1 || state === 2) {
      masteryLevel = 'Learning';
    } else if (state === 3) {
      // Review state - check stability for mastery
      masteryLevel = stability >= 30 ? 'Mastered' : 'Review';
    }

    // Calculate days since last review
    let daysSinceLastReview: number | null = null;
    if (lastReview) {
      const lastReviewDate = new Date(lastReview);
      const now = new Date();
      daysSinceLastReview = Math.floor(
        (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Calculate success rate from review history
    let successRate = 0;
    if (reviewData.length > 0) {
      const successfulReviews = reviewData.filter(review => review.grade >= 3).length;
      successRate = successfulReviews / reviewData.length;
    } else if (totalReviews > 0 && lapses >= 0) {
      // Estimate from FSRS data if no review history
      const successfulReviews = Math.max(0, totalReviews - lapses);
      successRate = totalReviews > 0 ? successfulReviews / totalReviews : 0;
    }

    // Calculate success streak
    let successStreak = 0;
    if (reviewData.length > 0) {
      let streak = 0;
      for (let i = reviewData.length - 1; i >= 0; i--) {
        const review = reviewData[i];
        if (review && review.grade >= 3) {
          streak++;
          if (streak > successStreak) {
            successStreak = streak;
          }
        } else {
          streak = 0;
        }
      }
    }

    return {
      totalReviews,
      averageStability: stability,
      averageDifficulty: difficulty,
      masteryLevel,
      daysSinceLastReview,
      successRate,
      successStreak,
    };
  }, [studyWordData, reviewData]);

  return {
    stats,
    isLoading,
    hasData: !!studyWordData,
  };
}
