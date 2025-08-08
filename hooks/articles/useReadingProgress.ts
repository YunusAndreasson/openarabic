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
  // Capture the progress value as it existed on the initial load of this hook.
  // This lets consumers differentiate between pre-existing progress and progress
  // that was created/updated during the current session.
  const initialLastSentenceReadRef = useRef<number | null>(null);

  // Query to get current reading progress
  const { data: progress, isLoading } = useQuery({
    queryKey: user?.id ? READING_PROGRESS_QUERY_KEY(user.id, articleId) : [],
    queryFn: async () => {
      if (!user?.id) return null;
      const result = await readingProgressService.getProgress(user.id, articleId);

      // Sanitize loaded progress to ensure it's valid for current article
      if (result && totalSentences > 0) {
        // Ensure last_sentence_read is within valid bounds (0-based indexing)
        const maxValidSentence = totalSentences - 1;
        const sanitizedLastSentence = Math.max(
          0,
          Math.min(result.last_sentence_read, maxValidSentence)
        );

        // If we had to sanitize, update the database with corrected value
        if (sanitizedLastSentence !== result.last_sentence_read) {
          // Update the database with the corrected value
          readingProgressService
            .updateProgress({
              userId: user.id,
              articleId,
              lastSentenceRead: sanitizedLastSentence,
              totalSentences,
            })
            .catch(() => {
              // Silent error - sanitization failed but we still use corrected value
            });
        }

        // Update the ref with sanitized value
        lastSavedSentenceRef.current = sanitizedLastSentence;

        // Return sanitized result
        return {
          ...result,
          last_sentence_read: sanitizedLastSentence,
        };
      }

      // Update the ref when we load existing progress (for unsanitized case)
      if (result) {
        lastSavedSentenceRef.current = result.last_sentence_read;
      }
      return result;
    },
    enabled: !!user?.id && articleId > 0, // Only enable when we have a valid articleId (not 0)
    staleTime: 30000, // Cache for 30 seconds
    refetchOnMount: false, // Don't refetch on mount - use persisted data first
    retry: 3, // Retry up to 3 times if the query fails
  });

  // Capture the initial progress exactly once when the first query result resolves
  // (post-sanitization). If there was no existing progress, this stores 0.
  useEffect(() => {
    if (initialLastSentenceReadRef.current === null && !isLoading) {
      initialLastSentenceReadRef.current = progress?.last_sentence_read ?? 0;
    }
  }, [isLoading, progress?.last_sentence_read]);

  // Mutation to update reading progress
  const updateProgressMutation = useMutation({
    mutationFn: async (lastSentenceRead: number) => {
      if (!user?.id) throw new Error('User not authenticated');

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
    },
    onError: error => {
      handleError(error instanceof Error ? error : new Error('Failed to update reading progress'));
    },
  });

  // Improved progress update logic
  const updateProgress = useCallback(
    (sentenceIndex: number) => {
      if (!isActive || !user?.id || articleId <= 0 || totalSentences <= 0) {
        return;
      }

      // Ensure sentenceIndex is valid (0-based indexing: 0 to totalSentences-1)
      const validSentenceIndex = Math.max(0, Math.min(sentenceIndex, totalSentences - 1));

      // Update if we've moved to a different position (not just forward progress)
      const lastRecorded = Math.max(
        lastSavedSentenceRef.current,
        progress?.last_sentence_read ?? 0
      );

      if (validSentenceIndex !== lastRecorded) {
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
    if (!isActive || !user?.id) return;

    const timeoutId = setTimeout(() => {
      updateProgress(currentSentenceIndex);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [currentSentenceIndex, isActive, updateProgress, user?.id]);

  // Also save progress immediately when component unmounts (article closed)
  useEffect(() => {
    return () => {
      // Save final progress when hook unmounts
      if (isActive && currentSentenceIndex >= 0 && user?.id && articleId > 0) {
        const lastRecorded = Math.max(
          lastSavedSentenceRef.current,
          progress?.last_sentence_read ?? 0
        );
        // Ensure valid bounds before saving
        const validFinalSentenceIndex = Math.max(
          0,
          Math.min(currentSentenceIndex, totalSentences - 1)
        );

        // Save progress if we're at a different position than last recorded
        if (validFinalSentenceIndex !== lastRecorded && user?.id) {
          // Save final progress without logging
          readingProgressService
            .updateProgress({
              userId: user.id,
              articleId,
              lastSentenceRead: validFinalSentenceIndex,
              totalSentences,
            })
            .catch(() => {
              // Silent error - final progress save failed
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
    updateProgress,
    isUpdating: updateProgressMutation.isPending,
    // New: expose the last sentence read for jumping functionality
    lastSentenceRead: progress?.last_sentence_read ?? 0,
    // New: expose initial values to distinguish pre-existing progress from session updates
    initialLastSentenceRead: initialLastSentenceReadRef.current ?? 0,
    hadExistingProgressOnMount: (initialLastSentenceReadRef.current ?? 0) > 0,
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
    staleTime: 0, // Always consider data stale to force refetch
    refetchOnMount: true, // Force refetch on mount to ensure we get fresh data
    retry: 3, // Retry up to 3 times if the query fails
    gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
  });
}

// Safe wrapper hook for bulk reading progress that handles missing AuthProvider
export function useSafeBulkReadingProgress(articleIds: number[]) {
  try {
    const result = useBulkReadingProgress(articleIds);
    // Ensure data is always a Map, even if the query returns undefined
    return {
      ...result,
      data: result.data || new Map(),
    };
  } catch {
    // AuthProvider not available - return empty result
    return {
      data: new Map(),
      isLoading: false,
      error: null,
    };
  }
}
