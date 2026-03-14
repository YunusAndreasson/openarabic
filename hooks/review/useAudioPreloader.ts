import { useCallback, useEffect, useRef, useState } from 'react';

import { clearAllPreloadedSources, preload } from 'expo-audio';

import { audioCache } from '@/services/audioCache';
import type { StudyWord } from '@/types/vocabulary.types';
import { generateStorageUrl } from '@/utils/storageUtils';

interface UseAudioPreloaderReturn {
  isPreloading: boolean;
  progress: number;
  isComplete: boolean;
}

/**
 * Hook to handle audio preloading for practice sessions
 * Preloads all Arabic and English audio files at session start
 *
 * @param wordQueue - Array of words in the current session
 * @param isSessionComplete - Whether the practice session is complete
 * @returns Preloading state and progress
 */
export const useAudioPreloader = (
  wordQueue: StudyWord[],
  isSessionComplete: boolean,
): UseAudioPreloaderReturn => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Track if audio has been preloaded to prevent infinite loops
  const hasPreloadedRef = useRef(false);
  // Track the actual word content to prevent unnecessary preloading
  const lastPreloadedWordsRef = useRef<string>('');

  /**
   * Preload all audio files for the session
   * Uses batching to prevent resource exhaustion
   */
  const preloadSessionAudio = useCallback(async (words: StudyWord[]) => {
    if (!words.length) {
      return;
    }

    setIsPreloading(true);
    setIsComplete(false);
    setProgress(0);

    try {
      const audioUrls: string[] = [];

      // Collect all unique audio URLs from the session words
      words.forEach(word => {
        if (word.root?.audio_url) {
          const audioUrl = generateStorageUrl('audio', word.root.audio_url);
          if (audioUrl && !audioUrls.includes(audioUrl)) {
            audioUrls.push(audioUrl);
          }
        }
        if (word.root?.audio_url_en) {
          const englishAudioUrl = generateStorageUrl('audio', word.root.audio_url_en);
          if (englishAudioUrl && !audioUrls.includes(englishAudioUrl)) {
            audioUrls.push(englishAudioUrl);
          }
        }
      });

      if (audioUrls.length === 0) {
        setIsPreloading(false);
        setIsComplete(true);
        return;
      }

      // Preload audio files in batches to prevent resource exhaustion
      const totalUrls = audioUrls.length;
      let completedUrls = 0;
      const BATCH_SIZE = 5; // Process 5 audio files at a time
      const BATCH_DELAY = 100; // 100ms delay between batches

      // Create progress tracking function
      const trackProgress = () => {
        completedUrls++;
        setProgress((completedUrls / totalUrls) * 100);
      };

      // Process audio files in batches
      for (let i = 0; i < audioUrls.length; i += BATCH_SIZE) {
        const batch = audioUrls.slice(i, i + BATCH_SIZE);

        // Process current batch in parallel
        const batchPromises = batch.map(async url => {
          try {
            const localPath = await audioCache.getAudio(url);
            // Buffer in native memory for near-instant playback
            try {
              await preload(localPath);
            } catch {
              // preload is an enhancement - disk cache is sufficient
            }
            trackProgress();
            return true;
          } catch {
            trackProgress(); // Still count as completed to avoid hanging
            return false;
          }
        });

        // Wait for current batch to complete
        await Promise.all(batchPromises);

        // Small delay between batches to prevent resource exhaustion
        if (i + BATCH_SIZE < audioUrls.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      setIsComplete(true);
    } finally {
      setIsPreloading(false);
    }
  }, []);

  // Effect: Preload audio when session starts
  useEffect(() => {
    const shouldPreload =
      wordQueue && wordQueue.length > 0 && !isPreloading && !isSessionComplete && !isComplete;

    if (!shouldPreload) return;

    // Generate unique key for current word queue to detect changes
    const currentWords = wordQueue.map(w => w.root_id).join(',');

    // Skip if we've already preloaded this exact set of words
    if (hasPreloadedRef.current && lastPreloadedWordsRef.current === currentWords) {
      return;
    }

    hasPreloadedRef.current = true;
    lastPreloadedWordsRef.current = currentWords;

    preloadSessionAudio(wordQueue);
  }, [wordQueue, isPreloading, isSessionComplete, isComplete, preloadSessionAudio]);

  // Reset preload flag and clear native preloaded sources when session completes
  useEffect(() => {
    if (isSessionComplete) {
      hasPreloadedRef.current = false;
      lastPreloadedWordsRef.current = '';
      setIsComplete(false);
      // Free native memory used by preloaded audio
      try {
        clearAllPreloadedSources().catch(() => {
          // Non-critical cleanup
        });
      } catch {
        // Non-critical cleanup
      }
    }
  }, [isSessionComplete]);

  return {
    isPreloading,
    progress,
    isComplete,
  };
};
