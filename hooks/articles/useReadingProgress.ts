import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/auth/useAuth';
import { readingProgressService } from '@/services/readingProgress';
import { handleError } from '@/utils/errorHandling';

interface UseReadingProgressOptions {
  articleId: number;
  totalSentences: number;
  currentSentenceIndex: number;
  isActive: boolean; // Only track when article is actually being read
}

export interface ReadingProgressData {
  articleId: number;
  lastSentenceRead: number;
  totalSentences: number;
  progressPercentage: number;
  updatedAt: string;
}

const READING_PROGRESS_QUERY_KEY = (userId: string, articleId: number) => [
  'reading-progress',
  userId,
  articleId,
];

const DEBOUNCE_DELAY = 500; // Reduced from 2000ms to 500ms for more responsive tracking

export function useReadingProgress({
  articleId,
  totalSentences,
  currentSentenceIndex,
  isActive,
}: UseReadingProgressOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSavedSentenceRef = useRef<number>(0);

  // Query to get current reading progress
  const { data: progress, isLoading } = useQuery({
    queryKey: user?.id ? READING_PROGRESS_QUERY_KEY(user.id, articleId) : [],
    queryFn: async () => {
      if (!user?.id) return null;
      const result = await readingProgressService.getProgress(user.id, articleId);
      // Update the ref when we load existing progress
      if (result) {
        lastSavedSentenceRef.current = result.last_sentence_read;
      }
      return result;
    },
    enabled: !!user?.id && articleId > 0,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Mutation to update reading progress
  const updateProgressMutation = useMutation({
    mutationFn: async (lastSentenceRead: number) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log(
        `📖 Updating reading progress: Article ${articleId}, Sentence ${lastSentenceRead}/${totalSentences}`
      );

      return readingProgressService.updateProgress({
        userId: user.id,
        articleId,
        lastSentenceRead,
        totalSentences,
      });
    },
    onSuccess: (_, lastSentenceRead) => {
      // Update our local ref
      lastSavedSentenceRef.current = lastSentenceRead;

      // Invalidate queries to refresh UI
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: READING_PROGRESS_QUERY_KEY(user.id, articleId),
        });
        // Also invalidate bulk progress queries to update lists
        queryClient.invalidateQueries({
          queryKey: ['reading-progress-bulk', user.id],
        });
      }

      console.log(
        `✅ Progress saved: ${lastSentenceRead}/${totalSentences} (${Math.round(
          (lastSentenceRead * 100) / totalSentences
        )}%)`
      );
    },
    onError: error => {
      console.error('❌ Failed to update reading progress:', error);
      handleError(error instanceof Error ? error : new Error('Failed to update reading progress'));
    },
  });

  // Improved progress update logic
  const updateProgress = useCallback(
    (sentenceIndex: number) => {
      if (!isActive || !user?.id || articleId <= 0 || totalSentences <= 0) {
        return;
      }

      // Ensure sentenceIndex is valid
      const validSentenceIndex = Math.max(0, Math.min(sentenceIndex, totalSentences));

      // Update if we've made meaningful progress (at least 1 sentence forward)
      const lastRecorded = Math.max(
        lastSavedSentenceRef.current,
        progress?.last_sentence_read ?? 0
      );

      if (validSentenceIndex > lastRecorded) {
        console.log(
          `📚 Progress detected: ${validSentenceIndex} > ${lastRecorded} for article ${articleId}`
        );
        updateProgressMutation.mutate(validSentenceIndex);
      }
    },
    [
      isActive,
      user?.id,
      articleId,
      totalSentences,
      progress?.last_sentence_read,
      updateProgressMutation,
    ]
  );

  // Auto-save progress with debouncing and improved cleanup
  useEffect(() => {
    if (!isActive || currentSentenceIndex <= 0 || !user?.id) return;

    const timeoutId = setTimeout(() => {
      updateProgress(currentSentenceIndex);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [currentSentenceIndex, isActive, updateProgress, user?.id]);

  // Also save progress immediately when component unmounts (article closed)
  useEffect(() => {
    return () => {
      // Save final progress when hook unmounts
      if (isActive && currentSentenceIndex > 0 && user?.id && articleId > 0) {
        const lastRecorded = Math.max(
          lastSavedSentenceRef.current,
          progress?.last_sentence_read ?? 0
        );
        if (currentSentenceIndex > lastRecorded) {
          console.log(
            `💾 Saving final progress on unmount: ${currentSentenceIndex}/${totalSentences}`
          );
          readingProgressService
            .updateProgress({
              userId: user.id,
              articleId,
              lastSentenceRead: currentSentenceIndex,
              totalSentences,
            })
            .catch(error => {
              console.error('❌ Failed to save final progress:', error);
            });
        }
      }
    };
  }, []); // Empty dependency array - this effect only runs on unmount

  return {
    progress: progress
      ? {
          articleId: progress.article_id,
          lastSentenceRead: progress.last_sentence_read,
          totalSentences: progress.total_sentences,
          progressPercentage: progress.progress_percentage ?? 0,
          updatedAt: progress.updated_at ?? '',
        }
      : null,
    isLoading,
    updateProgress: (sentenceIndex: number) => updateProgress(sentenceIndex),
    isUpdating: updateProgressMutation.isPending,
    // New: expose the last sentence read for jumping functionality
    lastSentenceRead: progress?.last_sentence_read ?? 0,
  };
}

// Hook for bulk reading progress (for article lists)
export function useBulkReadingProgress(articleIds: number[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: user?.id ? ['reading-progress-bulk', user.id, articleIds.sort()] : [],
    queryFn: async () => {
      if (!user?.id || articleIds.length === 0) return new Map();
      return readingProgressService.getBulkProgress(user.id, articleIds);
    },
    enabled: !!user?.id && articleIds.length > 0,
    staleTime: 60000, // Cache for 1 minute
  });
}

// Safe wrapper hook for bulk reading progress that handles missing AuthProvider
export function useSafeBulkReadingProgress(articleIds: number[]) {
  try {
    return useBulkReadingProgress(articleIds);
  } catch {
    // AuthProvider not available (e.g., in tests) - return empty result
    return {
      data: new Map(),
      isLoading: false,
      error: null,
    };
  }
}
