import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { articlesService } from '@/services/articles';

export interface WordTimestamp {
  word: string;
  start_time: number;
  end_time: number;
  duration: number;
  word_index: number;
  char_start_index: number;
  char_end_index: number;
}

/**
 * Hook to fetch and manage word timestamps for an article
 */
export function useWordTimestamps(articleId: number | null) {
  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['article-word-timestamps-v2', articleId], // Changed key to force refetch
    queryFn: async () => {
      if (!articleId) return null;
      return await articlesService.getArticleById(articleId);
    },
    enabled: !!articleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const wordTimestamps = useMemo(() => {
    if (!article?.word_timestamps) {
      return [];
    }

    try {
      const timestamps = article.word_timestamps as unknown as WordTimestamp[];

      // Validate the structure
      if (!Array.isArray(timestamps)) {
        return [];
      }

      // Sort by word_index to ensure proper order
      const sortedTimestamps = timestamps.sort((a, b) => a.word_index - b.word_index);

      return sortedTimestamps;
    } catch {
      return [];
    }
  }, [article?.word_timestamps]);

  // Get the word that should be highlighted at a given audio position
  const getCurrentWordIndex = useMemo(
    () =>
      (audioPosition: number): number => {
        if (!wordTimestamps.length) {
          return -1;
        }

        // Find the word that is currently being played
        const currentWord = wordTimestamps.find(
          timestamp => audioPosition >= timestamp.start_time && audioPosition <= timestamp.end_time
        );

        if (!currentWord) {
          // Check if we're beyond the last word's end time
          const lastWord = wordTimestamps[wordTimestamps.length - 1];
          if (lastWord && audioPosition > lastWord.end_time) {
            // Handle incomplete timestamps gracefully
            const timeBeyond = audioPosition - lastWord.end_time;

            // If we're not too far beyond, keep the last word highlighted briefly
            if (timeBeyond <= 3.0) {
              // Reduced from 5s to 3s for better UX
              return lastWord.word_index;
            }

            // If we've been beyond timestamps for a while, clear highlighting
            // This prevents getting stuck on the last word indefinitely
            if (timeBeyond > 8.0) {
              // Clear after 8 seconds beyond last timestamp
              return -1; // Clear highlight - timestamps are incomplete
            }

            // For moderate time beyond (3-8 seconds), keep last word highlighted
            return lastWord.word_index;
          }

          // Check if we're before the first word
          const firstWord = wordTimestamps[0];
          if (firstWord && audioPosition < firstWord.start_time) {
            return -1; // This is expected - audio hasn't reached words yet
          }

          // Debug: find the closest word to understand what's happening
          const closestWord = wordTimestamps.reduce((closest, current) => {
            const currentDiff = Math.min(
              Math.abs(audioPosition - current.start_time),
              Math.abs(audioPosition - current.end_time)
            );
            const closestDiff = Math.min(
              Math.abs(audioPosition - closest.start_time),
              Math.abs(audioPosition - closest.end_time)
            );
            return currentDiff < closestDiff ? current : closest;
          });

          // If the closest word is very close (within 0.3 seconds), highlight it anyway
          const diff = Math.min(
            Math.abs(audioPosition - closestWord.start_time),
            Math.abs(audioPosition - closestWord.end_time)
          );
          if (diff <= 0.3) {
            return closestWord.word_index;
          }
        }

        return currentWord ? currentWord.word_index : -1;
      },
    [wordTimestamps]
  );

  // Get word info by index
  const getWordByIndex = useMemo(
    () =>
      (index: number): WordTimestamp | null => {
        return wordTimestamps.find(timestamp => timestamp.word_index === index) || null;
      },
    [wordTimestamps]
  );

  return {
    wordTimestamps,
    isLoading,
    error,
    hasTimestamps: wordTimestamps.length > 0,
    getCurrentWordIndex,
    getWordByIndex,
  };
}
