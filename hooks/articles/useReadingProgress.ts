import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { readingProgressQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { readingProgressService, type ReadingProgress } from '@/services/readingProgress';
import type { ArticleId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { calculateProgressPercentage } from '@/utils/progressUtils';

interface UseReadingProgressOptions {
  articleId: ArticleId;
  totalSentences: number;
  currentSentenceIndex: number;
  isActive: boolean; // Only track when article is actually being read
}

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
  const pendingSentencesRef = useRef<Set<number>>(new Set());
  // Use bulk query as single source of truth - extract specific article progress
  const { data: progressMap, isLoading, isPlaceholderData } = useBulkReadingProgress([articleId]);

  // Extract progress for this specific article from the bulk cache
  const rawProgress = useMemo(() => {
    if (!progressMap || !user?.id || articleId <= 0) return null;
    return progressMap.get(articleId) || null;
  }, [progressMap, user?.id, articleId]);

  // Sanitize progress data to ensure it's valid for current article
  const progress = useMemo(() => {
    if (!rawProgress || totalSentences <= 0) return rawProgress;

    let needsSanitization = false;
    const sanitized = { ...rawProgress };

    // Ensure last_sentence_read is within valid bounds (0-based indexing)
    const maxValidSentence = totalSentences - 1;
    const sanitizedLastSentence = Math.max(
      0,
      Math.min(rawProgress.last_sentence_read, maxValidSentence),
    );

    if (sanitizedLastSentence !== rawProgress.last_sentence_read) {
      sanitized.last_sentence_read = sanitizedLastSentence;
      needsSanitization = true;
    }

    return needsSanitization ? sanitized : rawProgress;
  }, [rawProgress, totalSentences]);

  // Update database if sanitization was required
  useEffect(() => {
    if (!rawProgress || !user?.id || !progress || totalSentences <= 0) return;

    // Check if we sanitized the data (last_sentence_read changed)
    const lastSentenceNeedsFix = rawProgress.last_sentence_read !== progress.last_sentence_read;

    if (lastSentenceNeedsFix) {
      // Update the database with the corrected value (silent failure)
      readingProgressService
        .updateProgress({
          userId: user.id,
          articleId,
          lastSentenceRead: progress.last_sentence_read,
          totalSentences,
        })
        .catch(() => {
          // Silent error - sanitization update failed but we still use corrected value
        });
    }
  }, [rawProgress, progress, user?.id, articleId, totalSentences]);

  // Update the ref when we load progress
  useEffect(() => {
    if (progress) {
      lastSavedSentenceRef.current = progress.last_sentence_read;
    }
  }, [progress?.last_sentence_read]);

  const isInitialProgressReady = !isLoading && !isPlaceholderData;
  const initialLastSentenceRead = isInitialProgressReady ? (progress?.last_sentence_read ?? 0) : 0;

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
      // Mutations can settle out of order. Never let an older completion lower
      // the local high-water mark and reopen an already reserved range.
      lastSavedSentenceRef.current = Math.max(lastSavedSentenceRef.current, lastSentenceRead);

      // Invalidate queries to refresh UI
      if (user?.id) {
        // Invalidate bulk progress query (single source of truth)
        queryClient.invalidateQueries({
          queryKey: readingProgressQueries.bulk(user.id).queryKey,
        });
      }
    },
    onError: error => {
      handleError(error instanceof Error ? error : new Error('Failed to update reading progress'));
    },
    onSettled: (_data, _error, lastSentenceRead) => {
      pendingSentencesRef.current.delete(lastSentenceRead);
    },
  });

  // Only save forward progress (never regress)
  const updateProgress = useCallback(
    (sentenceIndex: number) => {
      if (!isActive || !user?.id || articleId <= 0 || totalSentences <= 0) {
        return;
      }

      // Ensure sentenceIndex is valid (0-based indexing: 0 to totalSentences-1)
      const validSentenceIndex = Math.max(0, Math.min(sentenceIndex, totalSentences - 1));

      // Only save if we've advanced beyond the last recorded position
      const lastRecorded = Math.max(
        lastSavedSentenceRef.current,
        progress?.last_sentence_read ?? 0,
        ...pendingSentencesRef.current,
      );

      if (validSentenceIndex > lastRecorded) {
        // Reserve synchronously before starting the request. Failed requests
        // leave this set in onSettled and can then be retried; successful ones
        // advance lastSavedSentenceRef in onSuccess.
        pendingSentencesRef.current.add(validSentenceIndex);
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
    ],
  );

  // Auto-save progress with debouncing
  useEffect(() => {
    if (!isActive || !user?.id || currentSentenceIndex < 0) return;

    const timeoutId = setTimeout(() => {
      updateProgress(currentSentenceIndex);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [currentSentenceIndex, isActive, updateProgress, user?.id, articleId]);

  // Refs to capture latest values for unmount cleanup (avoid stale closure)
  const unmountDataRef = useRef({
    isActive,
    currentSentenceIndex,
    userId: user?.id,
    articleId,
    totalSentences,
    progressLastSentence: progress?.last_sentence_read ?? 0,
  });

  // Stable ref for queryClient so unmount cleanup can invalidate cache
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    queryClientRef.current = queryClient;
  });

  // Update refs whenever values change
  useEffect(() => {
    unmountDataRef.current = {
      isActive,
      currentSentenceIndex,
      userId: user?.id,
      articleId,
      totalSentences,
      progressLastSentence: progress?.last_sentence_read ?? 0,
    };
  }, [
    isActive,
    currentSentenceIndex,
    user?.id,
    articleId,
    totalSentences,
    progress?.last_sentence_read,
  ]);

  // Also save progress immediately when component unmounts (article closed)
  useEffect(() => {
    return () => {
      // Save final progress when hook unmounts using latest values from ref
      const data = unmountDataRef.current;
      if (data.isActive && data.currentSentenceIndex >= 0 && data.userId && data.articleId > 0) {
        const lastRecorded = Math.max(lastSavedSentenceRef.current, data.progressLastSentence);
        // Ensure valid bounds before saving
        const validFinalSentenceIndex = Math.max(
          0,
          Math.min(data.currentSentenceIndex, data.totalSentences - 1),
        );

        // Never overwrite newer stored progress with an earlier position.
        if (validFinalSentenceIndex > lastRecorded) {
          // Save final progress and invalidate cache so Explore tab updates immediately
          readingProgressService
            .updateProgress({
              userId: data.userId,
              articleId: data.articleId,
              lastSentenceRead: validFinalSentenceIndex,
              totalSentences: data.totalSentences,
            })
            .then(() => {
              if (data.userId) {
                queryClientRef.current.invalidateQueries({
                  queryKey: readingProgressQueries.bulk(data.userId).queryKey,
                });
              }
            })
            .catch(() => {
              // Silent error - final progress save failed
            });
        }
      }
    };
  }, []); // Empty dependency array is safe now - cleanup uses ref values

  return {
    progress: progress
      ? {
          articleId: progress.article_id,
          lastSentenceRead: progress.last_sentence_read,
          totalSentences: progress.total_sentences,
          progressPercentage: calculateProgressPercentage(
            progress.last_sentence_read,
            progress.total_sentences,
          ),
          updatedAt: progress.updated_at ?? '',
        }
      : null,
    isLoading,
    updateProgress,
    isUpdating: updateProgressMutation.isPending,
    lastSentenceRead: progress?.last_sentence_read ?? 0,
    isInitialProgressReady,
    initialLastSentenceRead,
    hadExistingProgressOnMount: initialLastSentenceRead > 0,
  };
}

export function useBulkReadingProgress(articleIds: ArticleId[]) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: user?.id
      ? readingProgressQueries.bulk(user.id).queryKey
      : (['reading-progress-bulk', undefined] as const),
    queryFn: async () => {
      // TypeScript guard - should never happen due to enabled check
      if (!user?.id) {
        return new Map<ArticleId, ReadingProgress>();
      }
      // Fetch ALL reading progress for this user (not just requested articleIds)
      // This creates a single shared cache entry that all components can use
      // The service's getBulkProgress without articleIds filter will fetch all progress
      return readingProgressService.getBulkProgress(user.id, []);
    },
    // Enable query only when we have a user ID
    enabled: Boolean(user?.id),
    // Use placeholderData to prevent undefined while query is disabled or fetching
    placeholderData: new Map<ArticleId, ReadingProgress>(),
    // Stale time controls when data needs refetching
    staleTime: 1000 * 10, // 10 seconds - refetch if older
    gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
    // Only refresh via pull-to-refresh, not on mount or reconnect
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Filter the full Map to only include requested articleIds for this component
  // This happens in the component, not in the query cache
  const filteredData = useMemo(() => {
    const data = query.data;
    // Early return for missing data, empty articleIds, or non-Map data
    if (!data || articleIds.length === 0 || !(data instanceof Map)) {
      return new Map<ArticleId, ReadingProgress>();
    }
    const filtered = new Map<ArticleId, ReadingProgress>();
    articleIds.forEach(id => {
      const progress = data.get(id);
      if (progress) {
        filtered.set(id, progress);
      }
    });
    return filtered;
  }, [query.data, articleIds]);

  return {
    ...query,
    // Always a Map: filteredData falls back to an empty Map, so consumers
    // never need null checks before the query resolves.
    data: filteredData,
  };
}
