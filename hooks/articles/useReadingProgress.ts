import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { readingProgressQueries } from '@/constants/queries';
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

  // Use bulk query as single source of truth - extract specific article progress
  const { data: progressMap, isLoading } = useBulkReadingProgress([articleId]);

  // Extract progress for this specific article from the bulk cache
  const rawProgress = useMemo(() => {
    if (!progressMap || !user?.id || articleId <= 0) return null;
    return progressMap.get(articleId) || null;
  }, [progressMap, user?.id, articleId]);

  // Sanitize progress data to ensure it's valid for current article
  const progress = useMemo(() => {
    if (!rawProgress || totalSentences <= 0) return rawProgress;

    let needsSanitization = false;
    let sanitized = { ...rawProgress };

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

    // Check if progress_percentage is null (database corruption/error)
    // This will be recalculated by the database on update
    if (rawProgress.progress_percentage === null) {
      needsSanitization = true;
    }

    return needsSanitization ? sanitized : rawProgress;
  }, [rawProgress, totalSentences]);

  // Update database if sanitization was required
  useEffect(() => {
    if (!rawProgress || !user?.id || !progress || totalSentences <= 0) return;

    // Check if we sanitized the data (last_sentence_read changed OR progress_percentage is null)
    const lastSentenceNeedsFix = rawProgress.last_sentence_read !== progress.last_sentence_read;
    const progressPercentageNeedsFix = rawProgress.progress_percentage === null;

    if (lastSentenceNeedsFix || progressPercentageNeedsFix) {
      // Update the database with the corrected value (silent failure)
      // Database will automatically recalculate progress_percentage (GENERATED ALWAYS column)
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
        // Invalidate bulk progress query (single source of truth)
        queryClient.invalidateQueries({
          queryKey: readingProgressQueries.keys.bulk(user.id),
        });
        // Invalidate streak query to update streak immediately after reading
        queryClient.invalidateQueries({
          queryKey: readingProgressQueries.keys.streak(user.id),
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
        progress?.last_sentence_read ?? 0,
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
    ],
  );

  // Auto-save progress with debouncing and improved cleanup
  useEffect(() => {
    if (!isActive || !user?.id) return;

    const timeoutId = setTimeout(() => {
      updateProgress(currentSentenceIndex);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [currentSentenceIndex, isActive, updateProgress, user?.id]);

  // Track if we've already recorded the initial article open (once per mount)
  const hasRecordedOpenRef = useRef(false);

  // IMMEDIATE ARTICLE OPEN TRACKING: Run once when component mounts
  useEffect(() => {
    if (!user?.id || articleId <= 0 || hasRecordedOpenRef.current) return;

    // Record article open immediately when component mounts
    const recordArticleOpen = async () => {
      try {
        // Fetch current progress directly to avoid circular dependency
        // (don't use cached progress since we'll invalidate it anyway)
        const currentProgress = await readingProgressService.getProgress(user.id, articleId);

        if (currentProgress) {
          // If progress exists, update it to refresh the updated_at timestamp
          // This counts as daily activity even if no new sentences were read
          await readingProgressService.updateProgress({
            userId: user.id,
            articleId,
            lastSentenceRead: currentProgress.last_sentence_read,
            totalSentences: currentProgress.total_sentences,
          });
        } else {
          // If no progress exists, create initial progress record
          // Use totalSentences if available, otherwise default to 1 (will be updated later)
          const sentencesToUse = totalSentences > 0 ? totalSentences : 1;
          await readingProgressService.updateProgress({
            userId: user.id,
            articleId,
            lastSentenceRead: 0,
            totalSentences: sentencesToUse,
          });
        }

        // Mark as recorded to prevent re-running
        hasRecordedOpenRef.current = true;

        // Delay query invalidation to avoid race conditions with scroll-to-position
        // The 2-second delay gives FlashList time to complete the resume scroll animation
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: readingProgressQueries.keys.bulk(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: readingProgressQueries.keys.streak(user.id),
          });
        }, 2000);
      } catch (error) {
        // Silent error - article open tracking failed but shouldn't break reading
        handleError(error as Error, {
          analyticsEventName: 'Article_Open_Tracking_Failed',
          sentryTags: { location: 'articles', action: 'record_open' },
          sentryExtra: { articleId, userId: user?.id, totalSentences },
          showToast: false, // Silent failure for tracking
          sentrySeverity: 'info', // Not critical, just tracking failure
        });
      }
    };

    // Execute immediately (no timeout) to ensure daily activity is tracked
    recordArticleOpen();
  }, [user?.id, articleId, totalSentences, queryClient]); // Removed progress to avoid circular dependency

  // ADDITIONAL: Track when article becomes active (fully loaded) - for additional updates
  // Use a separate ref to track if we've run the active tracking
  const hasRecordedActiveRef = useRef(false);

  useEffect(() => {
    if (!isActive || !user?.id || articleId <= 0 || hasRecordedActiveRef.current) return;

    // Additional update when article becomes fully active
    const recordActiveArticleOpen = async () => {
      try {
        // Fetch current progress directly to avoid circular dependency
        const currentProgress = await readingProgressService.getProgress(user.id, articleId);

        if (currentProgress && totalSentences > 0) {
          // Update with correct totalSentences when available
          await readingProgressService.updateProgress({
            userId: user.id,
            articleId,
            lastSentenceRead: currentProgress.last_sentence_read,
            totalSentences, // Use actual total sentences now that article is loaded
          });

          // Mark as recorded
          hasRecordedActiveRef.current = true;

          // Delay query invalidation to avoid disrupting scroll-to-position
          setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: readingProgressQueries.keys.bulk(user.id),
            });
            queryClient.invalidateQueries({
              queryKey: readingProgressQueries.keys.streak(user.id),
            });
          }, 2000);
        }
      } catch {
        // Silent error - additional tracking failed
      }
    };

    const activeTimeoutId = setTimeout(recordActiveArticleOpen, 500);
    return () => clearTimeout(activeTimeoutId);
  }, [isActive, user?.id, articleId, totalSentences, queryClient]); // Removed progress to avoid circular dependency

  // Refs to capture latest values for unmount cleanup (avoid stale closure)
  const unmountDataRef = useRef({
    isActive,
    currentSentenceIndex,
    userId: user?.id,
    articleId,
    totalSentences,
    progressLastSentence: progress?.last_sentence_read ?? 0,
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

        // Save progress if we're at a different position than last recorded
        if (validFinalSentenceIndex !== lastRecorded && data.userId) {
          // Save final progress without logging
          readingProgressService
            .updateProgress({
              userId: data.userId,
              articleId: data.articleId,
              lastSentenceRead: validFinalSentenceIndex,
              totalSentences: data.totalSentences,
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

export function useBulkReadingProgress(articleIds: number[]) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: user?.id
      ? readingProgressQueries.keys.bulk(user.id)
      : (['reading-progress-bulk', undefined] as const),
    queryFn: async () => {
      // TypeScript guard - should never happen due to enabled check
      if (!user?.id) {
        return new Map();
      }
      // Fetch ALL reading progress for this user (not just requested articleIds)
      // This creates a single shared cache entry that all components can use
      // The service's getBulkProgress without articleIds filter will fetch all progress
      return readingProgressService.getBulkProgress(user.id, []);
    },
    // Enable query only when we have a user ID
    enabled: Boolean(user?.id),
    // Use placeholderData to prevent undefined while query is disabled or fetching
    placeholderData: new Map(),
    // Don't set staleTime/retry here - let QueryClient defaults control for testability
    refetchOnMount: false, // Only refetch via cache invalidation or pull-to-refresh
    gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
    refetchOnReconnect: false, // Only refetch via pull-to-refresh
  });

  // Filter the full Map to only include requested articleIds for this component
  // This happens in the component, not in the query cache
  const filteredData = useMemo(() => {
    const data = query.data;
    // Early return for missing data, empty articleIds, or non-Map data
    if (!data || articleIds.length === 0 || !(data instanceof Map)) {
      return new Map();
    }
    const filtered = new Map();
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
    data: filteredData,
  };
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
