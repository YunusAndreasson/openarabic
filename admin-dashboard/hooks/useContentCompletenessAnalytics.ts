'use client';

import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabase';

interface ContentCompleteness {
  totalSentences: number;
  missingEnglishAudio: number;
  missingArabicAudio: number;
  missingBothAudio: number;
  totalWords: number;
  missingGrammarNotes: number;
  missingDifficultyLevel: number;
  completenessPercentage: number;
}

interface UseContentCompletenessAnalyticsReturn {
  isLoading: boolean;
  stats: ContentCompleteness;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContentCompletenessAnalytics(): UseContentCompletenessAnalyticsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ContentCompleteness>({
    totalSentences: 0,
    missingEnglishAudio: 0,
    missingArabicAudio: 0,
    missingBothAudio: 0,
    totalWords: 0,
    missingGrammarNotes: 0,
    missingDifficultyLevel: 0,
    completenessPercentage: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchCompleteness = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch sentence data (table is called article_sentences in the mobile app)
      const {
        data: sentences,
        error: sentencesError,
        count: sentencesCount,
      } = await supabaseAdmin
        .from('article_sentences')
        .select('id, audio_url_english, audio_url', { count: 'exact' });

      if (sentencesError) throw sentencesError;

      // Fetch word data
      const {
        data: words,
        error: wordsError,
        count: wordsCount,
      } = await supabaseAdmin
        .from('sentence_words')
        .select('id, grammar_note, difficulty_level', { count: 'exact' });

      if (wordsError) throw wordsError;

      // Calculate missing audio
      const missingEnglishAudio = sentences?.filter(s => !s.audio_url_english).length || 0;
      const missingArabicAudio = sentences?.filter(s => !s.audio_url).length || 0;
      const missingBothAudio =
        sentences?.filter(s => !s.audio_url_english && !s.audio_url).length || 0;

      // Calculate missing word data
      const missingGrammarNotes =
        words?.filter(w => !w.grammar_note || w.grammar_note.trim() === '').length || 0;
      const missingDifficultyLevel = words?.filter(w => w.difficulty_level === null).length || 0;

      // Calculate overall completeness percentage
      const totalItems = (sentencesCount || 0) * 2 + (wordsCount || 0) * 2; // Each sentence needs 2 audios, each word needs grammar + difficulty
      const completedItems =
        (sentencesCount || 0) * 2 -
        missingEnglishAudio -
        missingArabicAudio +
        ((wordsCount || 0) * 2 - missingGrammarNotes - missingDifficultyLevel);
      const completenessPercentage =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      setStats({
        totalSentences: sentencesCount || 0,
        missingEnglishAudio,
        missingArabicAudio,
        missingBothAudio,
        totalWords: wordsCount || 0,
        missingGrammarNotes,
        missingDifficultyLevel,
        completenessPercentage,
      });
    } catch (err) {
      console.error('Error fetching content completeness:', err);
      setError('Failed to load content completeness analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    await fetchCompleteness();
  };

  useEffect(() => {
    fetchCompleteness();
  }, []);

  return {
    isLoading,
    stats,
    error,
    refresh,
  };
}
