import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { gated, readingProgressQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import type { ReadingProgress } from '@/services/readingProgress';
import type { ArticleId } from '@/types/branded.types';
import { readingProgressMutation } from '@/utils/mutationDefaults';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { guestProgressAdvanced } from '@/store/guestLibrarySlice';
import { guestProgressRow, pendingGuestProgress } from '@/utils/guestLibrary';
import { calculateProgressPercentage } from '@/utils/progressUtils';

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
  const userId = user?.id;
  const dispatch = useAppDispatch();

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
  }, [articleId, userId]);

  // Extract progress for this specific article from the bulk cache
  const rawProgress = useMemo(() => {
    if (articleId <= 0) return null;
    return progressMap.get(articleId) || null;
  }, [progressMap, articleId]);

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

  // Refs to capture latest values for unmount cleanup (avoid stale closure)
  const unmountDataRef = useRef({
    isActive,
    userId,
    articleId,
    totalSentences,
    progressLastSentence: progress?.last_sentence_read ?? 0,
  });

  const { mutate, isPending } = useMutation({
    ...readingProgressMutation,
    onSettled: (_result, error, write) => {
      const active = unmountDataRef.current;
      if (write.articleId !== active.articleId || write.userId !== active.userId) return;
      pendingSentencesRef.current.delete(write.lastSentenceRead);
      if (!error)
        lastSavedSentenceRef.current = Math.max(
          lastSavedSentenceRef.current,
          write.lastSentenceRead,
        );
    },
  });

  // Update database if sanitization was required
  useEffect(() => {
    if (!rawProgress || !userId || !progress || totalSentences <= 0) return;

    // Check if we sanitized the data (last_sentence_read changed)
    const lastSentenceNeedsFix = rawProgress.last_sentence_read !== progress.last_sentence_read;

    if (lastSentenceNeedsFix) {
      mutate({
        userId,
        articleId,
        lastSentenceRead: progress.last_sentence_read,
        totalSentences,
      });
    }
  }, [rawProgress, progress, userId, articleId, totalSentences, mutate]);

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

  // Only save forward progress (never regress)
  const updateProgress = useCallback(
    (sentenceIndex: number) => {
      if (!isActive || articleId <= 0 || totalSentences <= 0) {
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
        if (!userId) {
          lastSavedSentenceRef.current = validSentenceIndex;
          dispatch(
            guestProgressAdvanced(
              guestProgressRow(
                articleId,
                validSentenceIndex,
                totalSentences,
                new Date().toISOString(),
              ),
            ),
          );
          return;
        }
        // Reserve synchronously before starting the request. Failed requests
        // leave this set in onSettled and can then be retried; successful ones
        // advance lastSavedSentenceRef in onSuccess.
        pendingSentencesRef.current.add(validSentenceIndex);
        mutate({
          userId,
          articleId,
          lastSentenceRead: validSentenceIndex,
          totalSentences,
        });
      }
    },
    [isActive, userId, articleId, totalSentences, progress?.last_sentence_read, mutate, dispatch],
  );

  // Called directly by the list's viewability callback. Keeping the current
  // position in refs avoids a React render for every newly visible sentence.
  const scheduleProgressUpdate = useCallback(
    (sentenceIndex: number) => {
      if (!isActive || sentenceIndex < 0) return;

      latestSentenceRef.current = Math.max(latestSentenceRef.current, sentenceIndex);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        debounceTimeoutRef.current = null;
        updateProgress(latestSentenceRef.current);
      }, DEBOUNCE_DELAY);
    },
    [isActive, updateProgress],
  );

  // Update refs whenever values change
  useEffect(() => {
    unmountDataRef.current = {
      isActive,
      userId,
      articleId,
      totalSentences,
      progressLastSentence: progress?.last_sentence_read ?? 0,
    };
  }, [isActive, userId, articleId, totalSentences, progress?.last_sentence_read]);

  // A route change or unmount flushes the last visible sentence for this article.
  useEffect(() => {
    const pendingSentences = pendingSentencesRef.current;
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      // Save final progress when hook unmounts using latest values from ref
      const data = unmountDataRef.current;
      if (
        data.isActive &&
        latestSentenceRef.current >= 0 &&
        data.articleId > 0 &&
        data.totalSentences > 0
      ) {
        const lastRecorded = Math.max(
          lastSavedSentenceRef.current,
          data.progressLastSentence,
          ...pendingSentences,
        );
        // Ensure valid bounds before saving
        const validFinalSentenceIndex = Math.max(
          0,
          Math.min(latestSentenceRef.current, data.totalSentences - 1),
        );

        // Never overwrite newer stored progress with an earlier position.
        if (validFinalSentenceIndex > lastRecorded) {
          if (!data.userId) {
            dispatch(
              guestProgressAdvanced(
                guestProgressRow(
                  data.articleId,
                  validFinalSentenceIndex,
                  data.totalSentences,
                  new Date().toISOString(),
                ),
              ),
            );
            return;
          }
          mutate({
            userId: data.userId,
            articleId: data.articleId,
            lastSentenceRead: validFinalSentenceIndex,
            totalSentences: data.totalSentences,
          });
        }
      }
    };
  }, [articleId, userId, mutate, dispatch]);

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
    isUpdating: isPending,
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
  const guestProgress = useAppSelector(state => state.guestLibrary.progress);
  const receipt = useAppSelector(state =>
    user ? state.guestLibrary.imported[user.id] : undefined,
  );

  // Filter the full Map to only include requested articleIds for this component
  // This happens in the component, not in the query cache
  const filteredData = useMemo(() => {
    const data = new Map(query.data);
    for (const row of pendingGuestProgress(guestProgress, receipt)) {
      const id = row.article_id as ArticleId;
      if (row.last_sentence_read > (data.get(id)?.last_sentence_read ?? -1)) data.set(id, row);
    }
    // Early return for missing data, empty articleIds, or non-Map data
    if (articleIds.length === 0) {
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
  }, [query.data, articleIds, guestProgress, receipt]);

  return {
    ...query,
    isLoading: !!user && query.isLoading,
    isPlaceholderData: !!user && query.isPlaceholderData,
    // Always a Map: filteredData falls back to an empty Map, so consumers
    // never need null checks before the query resolves.
    data: filteredData,
  };
}
