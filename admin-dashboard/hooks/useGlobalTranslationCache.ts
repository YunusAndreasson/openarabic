'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];

interface CacheData {
  timestamp: number;
  words: SentenceWord[];
  stats: {
    totalWords: number;
    uniqueWords: number;
    totalTranslations: number;
  };
}

interface CacheStats {
  totalWords: number;
  uniqueWords: number;
  totalTranslations: number;
  lastUpdated: Date | null;
  cacheSizeKB: number;
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

const CACHE_KEY = 'oa3-translation-cache';

export function useGlobalTranslationCache(): UseGlobalTranslationCacheReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [translationsMap, setTranslationsMap] = useState<Map<string, Set<string>>>(new Map());
  const [stats, setStats] = useState<CacheStats>({
    totalWords: 0,
    uniqueWords: 0,
    totalTranslations: 0,
    lastUpdated: null,
    cacheSizeKB: 0,
    avgTranslationsPerWord: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const buildTranslationMap = useCallback((words: SentenceWord[]) => {
    const map = new Map<string, Set<string>>();
    words.forEach(word => {
      if (!map.has(word.word_form)) {
        map.set(word.word_form, new Set());
      }
      map.get(word.word_form)!.add(word.english.trim());
    });
    return map;
  }, []);

  const calculateStats = useCallback(
    (cacheData: CacheData | null, map: Map<string, Set<string>>) => {
      if (!cacheData) {
        return {
          totalWords: 0,
          uniqueWords: 0,
          totalTranslations: 0,
          lastUpdated: null,
          cacheSizeKB: 0,
          avgTranslationsPerWord: 0,
        };
      }

      const totalTranslations = Array.from(map.values()).reduce(
        (sum, translations) => sum + translations.size,
        0,
      );

      const cacheString = JSON.stringify(cacheData);
      const cacheSizeKB = Math.round((cacheString.length * 2) / 1024); // UTF-16, 2 bytes per char

      return {
        totalWords: cacheData.words.length,
        uniqueWords: map.size,
        totalTranslations,
        lastUpdated: new Date(cacheData.timestamp),
        cacheSizeKB,
        avgTranslationsPerWord:
          map.size > 0 ? Math.round((totalTranslations / map.size) * 10) / 10 : 0,
      };
    },
    [],
  );

  const loadFromLocalStorage = useCallback((): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as CacheData;
      return parsed;
    } catch (err) {
      console.error('Error loading cache from localStorage:', err);
      return null;
    }
  }, []);

  const saveToLocalStorage = useCallback((cacheData: CacheData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Error saving cache to localStorage:', err);
    }
  }, []);

  const fetchFromDatabase = useCallback(async (): Promise<SentenceWord[]> => {
    // Fetch all words using pagination (Supabase default limit is 1000)
    const BATCH_SIZE = 1000;
    let allWords: SentenceWord[] = [];
    let from = 0;
    let hasMore = true;

    console.log('Fetching all words from database...');

    while (hasMore) {
      const {
        data,
        error: fetchError,
        count,
      } = await supabase
        .from('sentence_words')
        .select('id, word_form, english, position, grammar_note, sentence_id', { count: 'exact' })
        .order('word_form')
        .range(from, from + BATCH_SIZE - 1);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        allWords = [...allWords, ...data];
        from += BATCH_SIZE;

        // Log progress
        console.log(`Loaded ${allWords.length} / ${count || '?'} words...`);

        // Check if we have more data
        hasMore = data.length === BATCH_SIZE;
      } else {
        hasMore = false;
      }
    }

    console.log(`✓ Successfully loaded all ${allWords.length} words from database`);

    return allWords;
  }, []);

  const loadCache = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try loading from localStorage first
      const cached = loadFromLocalStorage();

      if (cached) {
        const map = buildTranslationMap(cached.words);
        setTranslationsMap(map);
        setStats(calculateStats(cached, map));
        setIsLoading(false);
        return;
      }

      // If no cache, fetch from database
      const words = await fetchFromDatabase();

      const cacheData: CacheData = {
        timestamp: Date.now(),
        words,
        stats: {
          totalWords: words.length,
          uniqueWords: new Set(words.map(w => w.word_form)).size,
          totalTranslations: 0, // Will be calculated
        },
      };

      saveToLocalStorage(cacheData);

      const map = buildTranslationMap(words);
      setTranslationsMap(map);
      setStats(calculateStats(cacheData, map));
    } catch (err) {
      console.error('Error loading cache:', err);
      setError('Failed to load translation cache');
    } finally {
      setIsLoading(false);
    }
  }, [
    loadFromLocalStorage,
    buildTranslationMap,
    calculateStats,
    saveToLocalStorage,
    fetchFromDatabase,
  ]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const words = await fetchFromDatabase();

      const cacheData: CacheData = {
        timestamp: Date.now(),
        words,
        stats: {
          totalWords: words.length,
          uniqueWords: new Set(words.map(w => w.word_form)).size,
          totalTranslations: 0,
        },
      };

      saveToLocalStorage(cacheData);

      const map = buildTranslationMap(words);
      setTranslationsMap(map);
      setStats(calculateStats(cacheData, map));
    } catch (err) {
      console.error('Error refreshing cache:', err);
      setError('Failed to refresh translation cache');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromDatabase, saveToLocalStorage, buildTranslationMap, calculateStats]);

  const clear = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setTranslationsMap(new Map());
    setStats({
      totalWords: 0,
      uniqueWords: 0,
      totalTranslations: 0,
      lastUpdated: null,
      cacheSizeKB: 0,
      avgTranslationsPerWord: 0,
    });
  }, []);

  useEffect(() => {
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
