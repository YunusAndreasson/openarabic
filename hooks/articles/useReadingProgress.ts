import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { gated, readingProgressQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { readingProgressService, type ReadingProgress } from '@/services/readingProgress';
import type { ArticleId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { managedRequest } from '@/utils/supabaseHelpers';

interface UseReadingProgressOptions {
  articleId: ArticleId;
  totalSentences: number;
  isActive: boolean; // Only track when article is actually being read
}

const DEBOUNCE_DELAY = 500; // Reduced from 2000ms to 500ms for more responsive tracking

export function useReadingProgress({
  articleId,
  totalSentences,
  isActive,
}: UseReadingProgressOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSavedSentenceRef = useRef<number>(0);
  const latestSentenceRef = useRef<number>(0);
  const pendingSentencesRef = useRef<Set<number>>(new Set());
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use bulk query as single source of truth - extract specific article progress
  const { data: progressMap, isLoading, isPlaceholderData } = useBulkReadingProgress([articleId]);

  // Route params can change without unmounting this hook. Do not let the old
  // article's timer or high-water refs suppress writes for the new article.
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    lastSavedSentenceRef.current = 0;
    latestSentenceRef.current = 0;
    pendingSentencesRef.current.clear();
  }, [articleId, user?.id]);

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
  const progressLastSentence = progress?.last_sentence_read;
  useEffect(() => {
    if (progressLastSentence !== undefined) {
      lastSavedSentenceRef.current = progressLastSentence;
      latestSentenceRef.current = Math.max(latestSentenceRef.current, progressLastSentence);
    }
  }, [progressLastSentence]);

  const isInitialProgressReady = !isLoading && !isPlaceholderData;
  const initialLastSentenceRead = isInitialProgressReady ? (progress?.last_sentence_read ?? 0) : 0;

  // Mutation to update reading progress
  const updateProgressMutation = useMutation({
    mutationFn: async (lastSentenceRead: number) => {
      if (!user?.id) throw new Error('User not authenticated');

      return readingProgressService.updateProgress(
        {
          userId: user.id,
          articleId,
          lastSentenceRead,
          totalSentences,
        },
        managedRequest(),
      );
    },
    onSuccess: (_, lastSentenceRead) => {
      // Mutations can settle out of order. Never let an older completion lower
      // the local high-water mark and reopen an already reserved range.
      lastSavedSentenceRef.current = Math.max(lastSavedSentenceRef.current, lastSentenceRead);

      // Update the shared cache directly. Invalidating here used to refetch the
      // entire user's progress map after every reading pause, notifying every
      // progress consumer in the app.
      if (user?.id) {
        queryClient.setQueryData(readingProgressQueries.bulk(user.id).queryKey, current => {
          const next = new Map(current);
          const existing = next.get(articleId);
          const now = new Date().toISOString();

          next.set(articleId, {
            article_id: articleId,
            user_id: user.id,
            last_sentence_read: Math.max(existing?.last_sentence_read ?? 0, lastSentenceRead),
            total_sentences: totalSentences,
            created_at: existing?.created_at ?? now,
            updated_at: now,
          });
          return next;
        });
      }
    },
    onError: error => {
      // The toast says what failed, never the request's own wording: a failed
      // save arrives as a SupabaseRequestError whose message is PostgREST's.
      void handleError(error, { toastMessage: STRINGS.FAILED_TO_UPDATE_READING_PROGRESS });
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

  // Called directly by the list's viewability callback. Keeping the current
  // position in refs avoids a React render for every newly visible sentence.
  const scheduleProgressUpdate = useCallback(
    (sentenceIndex: number) => {
      if (!isActive || !user?.id || sentenceIndex < 0) return;

      latestSentenceRef.current = Math.max(latestSentenceRef.current, sentenceIndex);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        debounceTimeoutRef.current = null;
        updateProgress(latestSentenceRef.current);
      }, DEBOUNCE_DELAY);
    },
    [isActive, updateProgress, user?.id],
  );

  // Refs to capture latest values for unmount cleanup (avoid stale closure)
  const unmountDataRef = useRef({
    isActive,
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
      userId: user?.id,
      articleId,
      totalSentences,
      progressLastSentence: progress?.last_sentence_read ?? 0,
    };
  }, [isActive, user?.id, articleId, totalSentences, progress?.last_sentence_read]);

  // Also save progress immediately when component unmounts (article closed)
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      // Save final progress when hook unmounts using latest values from ref
      const data = unmountDataRef.current;
      if (data.isActive && latestSentenceRef.current >= 0 && data.userId && data.articleId > 0) {
        const lastRecorded = Math.max(lastSavedSentenceRef.current, data.progressLastSentence);
        // Ensure valid bounds before saving
        const validFinalSentenceIndex = Math.max(
          0,
          Math.min(latestSentenceRef.current, data.totalSentences - 1),
        );

        // Never overwrite newer stored progress with an earlier position.
        if (validFinalSentenceIndex > lastRecorded) {
          const userId = data.userId;
          // Save final progress. Successful debounced mutations already keep
          // the shared cache current; this is only the last-chance flush.
          readingProgressService
            .updateProgress({
              userId,
              articleId: data.articleId,
              lastSentenceRead: validFinalSentenceIndex,
              totalSentences: data.totalSentences,
            })
            .then(() =>
              queryClientRef.current.invalidateQueries({
                queryKey: readingProgressQueries.bulk(userId).queryKey,
              }),
            )
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
    scheduleProgressUpdate,
    isUpdating: updateProgressMutation.isPending,
    lastSentenceRead: progress?.last_sentence_read ?? 0,
    isInitialProgressReady,
    initialLastSentenceRead,
    hadExistingProgressOnMount: initialLastSentenceRead > 0,
  };
}

export function useBulkReadingProgress(articleIds: ArticleId[]) {
  const { user } = useAuth();

  // ALL of the user's reading progress (not just the requested articleIds), in
  // the one shared cache entry every component reads — the factory's own
  // options, which this used to restate field for field.
  const query = useQuery(gated(readingProgressQueries.bulk, user?.id));

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
