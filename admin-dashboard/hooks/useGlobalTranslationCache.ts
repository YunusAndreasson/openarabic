'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];

interface CacheStats {
  totalWords: number;
  uniqueWords: number;
  totalTranslations: number;
  lastUpdated: Date | null;
  avgTranslationsPerWord: number;
}

interface UseGlobalTranslationCacheReturn {
  isLoading: boolean;
  translationsMap: Map<string, Set<string>>;
  stats: CacheStats;
  refresh: () => Promise<void>;
  clear: () => void;
  error: string | null;
}

export function useGlobalTranslationCache(): UseGlobalTranslationCacheReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [translationsMap, setTranslationsMap] = useState<Map<string, Set<string>>>(new Map());
  const [stats, setStats] = useState<CacheStats>({
    totalWords: 0,
    uniqueWords: 0,
    totalTranslations: 0,
    lastUpdated: null,
    avgTranslationsPerWord: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const buildTranslationMap = useCallback((words: SentenceWord[]) => {
    const map = new Map<string, Set<string>>();
    for (const word of words) {
      if (!map.has(word.word_form)) {
        map.set(word.word_form, new Set());
      }
      map.get(word.word_form)!.add(word.english.trim());
    }
    return map;
  }, []);

  const calculateStats = useCallback(
    (totalWords: number, map: Map<string, Set<string>>, timestamp: number): CacheStats => {
      const totalTranslations = Array.from(map.values()).reduce(
        (sum, translations) => sum + translations.size,
        0,
      );

      return {
        totalWords,
        uniqueWords: map.size,
        totalTranslations,
        lastUpdated: new Date(timestamp),
        avgTranslationsPerWord:
          map.size > 0 ? Math.round((totalTranslations / map.size) * 10) / 10 : 0,
      };
    },
    [],
  );

  const fetchFromDatabase = useCallback(async (): Promise<SentenceWord[]> => {
    const BATCH_SIZE = 1000;
    const allWords: SentenceWord[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error: fetchError } = await supabase
        .from('sentence_words')
        .select('id, word_form, english, position, grammar_note, sentence_id, audio_url, difficulty_level, root_id, word_type_id')
        .order('word_form')
        .range(from, from + BATCH_SIZE - 1);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        allWords.push(...data);
        from += BATCH_SIZE;
        hasMore = data.length === BATCH_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allWords;
  }, []);

  const applyWords = useCallback(
    (words: SentenceWord[]) => {
      const map = buildTranslationMap(words);
      setTranslationsMap(map);
      setStats(calculateStats(words.length, map, Date.now()));
    },
    [buildTranslationMap, calculateStats],
  );

  const loadCache = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const words = await fetchFromDatabase();
      applyWords(words);
    } catch (err) {
      console.error('Error loading translation data:', err);
      setError('Failed to load translation data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromDatabase, applyWords]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const words = await fetchFromDatabase();
      applyWords(words);
    } catch (err) {
      console.error('Error refreshing translation data:', err);
      setError('Failed to refresh translation data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromDatabase, applyWords]);

  const clear = useCallback(() => {
    setTranslationsMap(new Map());
    setStats({
      totalWords: 0,
      uniqueWords: 0,
      totalTranslations: 0,
      lastUpdated: null,
      avgTranslationsPerWord: 0,
    });
  }, []);

  useEffect(() => {
    // Clean up old localStorage cache if it exists
    try {
      localStorage.removeItem('oa3-translation-cache');
    } catch {
      // Ignore
    }

    loadCache();
  }, [loadCache]);

  return {
    isLoading,
    translationsMap,
    stats,
    refresh,
    clear,
    error,
  };
}
