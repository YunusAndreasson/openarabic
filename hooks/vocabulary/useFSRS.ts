import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from 'ts-fsrs';
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

import {
  DEFAULT_SESSION_COOLDOWN_HOURS,
  FSRS_BASE_KEY,
  MIN_WORD_SPACING,
  OPTIMIZED_FSRS_CONFIG,
} from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type { FSRSStateTracking, UseFSRSOptions, UseFSRSResult } from '@/types/fsrs.types';
import type { WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import {
  calculateWordPriority,
  createSpacingState,
  getNextWordWithSpacing as getNextFromSpacingQueue,
  updateSpacingCounters as updateSpacingState,
  type SpacingState,
} from '@/utils/fsrsSpacing';
import { PriorityQueue } from '@/utils/priorityQueue';

// Consolidated counters and tracking data
interface FSRSCounters {
  totalWords: number;
  processedWords: number;
  knownWords: number;
  uniqueWords: Set<RootId>;
}

// Enhanced state tracking with more fields
interface EnhancedFSRSStateTracking extends FSRSStateTracking {
  completionTriggered: boolean;
  isProcessingUpdate: boolean;
  queueInitialized: boolean;
}

export function useFSRS({
  userId,
  onComplete,
  sessionCooldownHours: _sessionCooldownHours = DEFAULT_SESSION_COOLDOWN_HOURS,
}: UseFSRSOptions): UseFSRSResult {
  const [wordQueue, setWordQueue] = useState<StudyWord[]>([]);
  const [currentWord, setCurrentWord] = useState<StudyWord | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // Consolidated counters in a single ref
  const countersRef = useRef<FSRSCounters>({
    totalWords: 0,
    processedWords: 0,
    knownWords: 0,
    uniqueWords: new Set<RootId>(),
  });

  // Priority queue for efficient reordering
  const queueRef = useRef<PriorityQueue<StudyWord>>(new PriorityQueue<StudyWord>());

  // Spacing queue to enforce MIN_WORD_SPACING between repeats
  const spacingQueueRef = useRef<SpacingState>(createSpacingState());

  // Enhanced state tracking
  const stateTrackingRef = useRef<EnhancedFSRSStateTracking>({
    isProcessingUpdate: false,
    completionTriggered: false,
    queueInitialized: false,
  });

  // Track the last initialized set of due words (by root_id signature)
  const lastQueueSignatureRef = useRef<string | null>(null);

  // Timeout for completion callback (Phase 2.2: removed initTimeoutRef - now synchronous)
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  // Configure FSRS with proper learning steps
  const fsrsParams = useMemo(() => generatorParameters(OPTIMIZED_FSRS_CONFIG), []);

  // Create FSRS instance with configured parameters
  const fsrsInstance = useMemo(() => fsrs(fsrsParams), [fsrsParams]);

  const { data: dueWords, isLoading } = useQuery({
    ...fsrsQueries.due(userId || ''),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      // If the last session was recently completed, temporarily apply cooldown
      const lastCompletedAt = queryClient.getQueryData<number>([
        FSRS_BASE_KEY,
        userId,
        'lastCompletedAt',
      ]);
      const recentlyCompleted =
        typeof lastCompletedAt === 'number' &&
        Date.now() - lastCompletedAt < _sessionCooldownHours * 60 * 60 * 1000;

      const words = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        forStats: false,
        ...(recentlyCompleted ? { sessionCooldownHours: _sessionCooldownHours } : {}),
      });

      return words;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Mobile-only: no window focus concept
    refetchOnReconnect: true,
  });

  // Helper function to get next available word with proper spacing
  const getNextWordWithSpacing = useCallback((): StudyWord | null => {
    return getNextFromSpacingQueue(queueRef.current, spacingQueueRef.current);
  }, []);

  // Helper function to update spacing counters
  const updateSpacingCounters = useCallback((processedWordId: number) => {
    updateSpacingState(spacingQueueRef.current, processedWordId);
  }, []);

  // Phase 2.2: Initialize queue synchronously (removed setTimeout wrapper)
  useEffect(() => {
    if (isLoading || !dueWords) return;

    const effectiveDueWords: StudyWord[] = Array.isArray(dueWords) ? dueWords : [];

    // Build a stable signature of the current due words
    const signature = effectiveDueWords
      .map(w => w.root_id)
      .filter((id): id is RootId => id != null)
      .sort((a, b) => a - b)
      .join(',');

    // If we've already initialized with the same set, skip re-initialization
    if (stateTrackingRef.current.queueInitialized && lastQueueSignatureRef.current === signature) {
      return;
    }

    // Mark as initialized for this signature
    stateTrackingRef.current.queueInitialized = true;
    lastQueueSignatureRef.current = signature;

    // Clear completion timeout if exists
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }

    // Initialize queue synchronously (no setTimeout wrapper)
    if (effectiveDueWords.length > 0) {
      countersRef.current.totalWords = effectiveDueWords.length;
      countersRef.current.uniqueWords = new Set(effectiveDueWords.map(word => word.root_id));
      countersRef.current.processedWords = 0;
      countersRef.current.knownWords = 0;

      // Reset spacing queue
      spacingQueueRef.current = createSpacingState();

      // Set all state in a predictable order
      setProgress(0);
      setIsComplete(false);
      stateTrackingRef.current.completionTriggered = false;
      stateTrackingRef.current.isProcessingUpdate = false;

      queueRef.current = new PriorityQueue<StudyWord>();

      // Prioritize words by due date and FSRS metrics using heapify
      const items = effectiveDueWords;
      const priorities = effectiveDueWords.map(w => calculateWordPriority(w));
      queueRef.current.heapify(items, priorities);
      const ordered = queueRef.current.toArray();
      setWordQueue(ordered);

      const first = getNextWordWithSpacing();

      if (first) {
        // We have available words, start session
        setCurrentWord(first);
      } else {
        setIsComplete(true);
        if (onComplete && !stateTrackingRef.current.completionTriggered) {
          stateTrackingRef.current.completionTriggered = true;
          onComplete();
        }
      }
    } else {
      // No words available - complete immediately
      setIsComplete(true);
      if (onComplete && !stateTrackingRef.current.completionTriggered) {
        stateTrackingRef.current.completionTriggered = true;
        onComplete();
      }
    }

    return () => {
      // Cleanup completion timeout on unmount
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, [dueWords, isLoading, onComplete, getNextWordWithSpacing]);

  const convertToFSRSCard = useCallback((word: StudyWord): Card => {
    // Phase 1.3: Use explicit null checks instead of truthy checks
    // fsrs_reps: 0 and fsrs_stability: 0 are valid but falsy
    if (
      word.fsrs_state === State.New ||
      (word.fsrs_reps == null && word.fsrs_stability == null && !word.fsrs_last_review)
    ) {
      const emptyCard = createEmptyCard(new Date());
      return {
        ...emptyCard,
        due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      };
    }

    // Calculate elapsed_days from last_review (required by ts-fsrs Card type)
    const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : undefined;
    const elapsed_days = lastReview
      ? Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      stability: word.fsrs_stability ?? 0,
      difficulty: word.fsrs_difficulty ?? 6.5,
      elapsed_days,
      scheduled_days: word.fsrs_scheduled_days ?? 0,
      learning_steps: word.fsrs_learning_steps ?? 0,
      reps: word.fsrs_reps ?? 0,
      lapses: word.fsrs_lapses ?? 0,
      state: word.fsrs_state ?? State.New,
      last_review: lastReview,
    };
  }, []);

  const updateWord = useCallback(
    async (rootId: RootId, confidence: WordConfidence) => {
      if (!userId || !currentWord) {
        return;
      }

      if (
        isComplete ||
        stateTrackingRef.current.completionTriggered ||
        stateTrackingRef.current.isProcessingUpdate
      ) {
        return;
      }

      stateTrackingRef.current.isProcessingUpdate = true;

      // Phase 1.4: Add error handling around FSRS algorithm
      let newCard: Card;
      try {
        const card = convertToFSRSCard(currentWord);
        const now = new Date();

        const rating =
          confidence === 'known'
            ? Rating.Good
            : confidence === 'vague'
              ? Rating.Hard
              : Rating.Again;

        const result = fsrsInstance.next(card, now, rating);
        newCard = result.card;
      } catch (error) {
        // Track analytics
        handleError(error instanceof Error ? error : new Error(String(error)), {
          toastType: ToastType.ERROR,
          analyticsEventName: 'FSRS_Algorithm_Error',
          analyticsProperties: {
            rootId: currentWord.root_id,
            confidence,
          },
        });

        // Graceful fallback: Simple increment without FSRS
        const lastReviewDate = currentWord.fsrs_last_review
          ? new Date(currentWord.fsrs_last_review)
          : undefined;
        const elapsed_days = lastReviewDate
          ? Math.floor((Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const fallbackCard: Card = {
          due: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          stability: currentWord.fsrs_stability ?? 0.4,
          difficulty: currentWord.fsrs_difficulty ?? 6.5,
          elapsed_days,
          scheduled_days: 0,
          learning_steps: currentWord.fsrs_learning_steps ?? 0,
          reps: (currentWord.fsrs_reps ?? 0) + 1,
          lapses: currentWord.fsrs_lapses ?? 0,
          state: currentWord.fsrs_state ?? State.New,
          last_review: new Date(),
        };

        newCard = fallbackCard;
      }

      const now = new Date();

      // Phase 1.2: Use FSRS-calculated due date (trust learning_steps: ['1m', '10m'])
      // No need to override - FSRS handles this correctly
      const wordUpdateData = {
        fsrs_due: newCard.due.toISOString(),
        fsrs_stability: newCard.stability,
        fsrs_difficulty: newCard.difficulty,
        fsrs_scheduled_days: newCard.scheduled_days,
        fsrs_reps: newCard.reps,
        fsrs_learning_steps: newCard.learning_steps,
        fsrs_lapses: newCard.lapses,
        fsrs_state: newCard.state,
        fsrs_last_review: now.toISOString(),
      };

      // Track session counters immediately
      countersRef.current.processedWords += 1;
      countersRef.current.uniqueWords.add(rootId);
      if (confidence === 'known') {
        countersRef.current.knownWords += 1;
      } else {
        // For vague/unknown responses, add the word back to the spacing queue
        // Word will stay in session until marked as "known"
        const updatedWord: StudyWord = {
          ...currentWord,
          // Use FSRS-calculated state for next review in this session
          fsrs_stability: newCard.stability,
          fsrs_difficulty: newCard.difficulty,
          fsrs_scheduled_days: newCard.scheduled_days,
          fsrs_reps: newCard.reps,
          fsrs_learning_steps: newCard.learning_steps,
          fsrs_lapses: newCard.lapses,
          fsrs_state: newCard.state,
          fsrs_last_review: now.toISOString(),
          fsrs_due: newCard.due.toISOString(),
        };
        spacingQueueRef.current.spacedWords.push({
          word: updatedWord,
          remainingSpacing: MIN_WORD_SPACING,
        });
      }

      // Update spacing counters before selecting next word
      updateSpacingCounters(rootId);

      // Select the next word optimistically
      let nextItem = getNextWordWithSpacing();
      // Safety: never immediately return the same word again
      // If the next item matches the just-processed root, keep popping
      // until we find a different word or the queue is exhausted.
      let guardIterations = 0;
      while (nextItem?.root_id === rootId && guardIterations < 5) {
        nextItem = getNextWordWithSpacing();
        guardIterations += 1;
      }
      const remaining = queueRef.current.toArray();

      // FIXED: Use totalWords instead of uniqueWords for progress calculation
      // Progress should always be available, so no need to check if totalWords exists
      // But we need to ensure counters are properly initialized first
      if (!stateTrackingRef.current.queueInitialized) {
        setProgress(0); // Default to 0 when queue isn't initialized yet
        stateTrackingRef.current.isProcessingUpdate = false;
        return;
      }

      const totalWordsInSession = countersRef.current.totalWords;

      // Progress calculation: ONLY count words that are known (truly finished)
      // Failed words that go to spacing queue should NOT increase progress
      const newProgress =
        totalWordsInSession > 0
          ? Math.min(Math.round((countersRef.current.knownWords / totalWordsInSession) * 100), 100)
          : 0;
      setProgress(newProgress);

      // FIXED: Ensure forward progress when only spaced words remain (avoid deadlock)
      // If there's no next item, try to move any ready or nearly-ready spaced words back to the queue.
      if (!nextItem) {
        // First, move any fully ready spaced words
        const readySpacedWords = spacingQueueRef.current.spacedWords.filter(
          item => item.remainingSpacing <= 0,
        );

        if (readySpacedWords.length > 0) {
          readySpacedWords.forEach(item => {
            const priority = calculateWordPriority(item.word);
            queueRef.current.push(item.word, priority);
          });

          spacingQueueRef.current.spacedWords = spacingQueueRef.current.spacedWords.filter(
            item => item.remainingSpacing > 0,
          );

          nextItem = getNextWordWithSpacing();
        }

        // If still none, but the session isn't fully known yet, requeue the smallest spacing candidate
        if (!nextItem) {
          const { knownWords, totalWords } = countersRef.current;
          const allKnown = totalWords > 0 && knownWords >= totalWords;

          if (!allKnown && spacingQueueRef.current.spacedWords.length > 0) {
            const candidate = spacingQueueRef.current.spacedWords.reduce(
              (min, curr) => (!min || curr.remainingSpacing < min.remainingSpacing ? curr : min),
              undefined as (typeof spacingQueueRef.current.spacedWords)[number] | undefined,
            );

            if (candidate) {
              // FORCE OVERRIDE: allow immediate repeat of the smallest-spacing candidate
              // Remove from spaced list and from recent guard to avoid skip
              spacingQueueRef.current.spacedWords = spacingQueueRef.current.spacedWords.filter(
                w => w.word.root_id !== candidate.word.root_id,
              );
              spacingQueueRef.current.recentWords = spacingQueueRef.current.recentWords.filter(
                id => id !== candidate.word.root_id,
              );
              nextItem = candidate.word;
            }
          }

          // If we still have no next item, complete immediately
          if (!nextItem && !stateTrackingRef.current.completionTriggered) {
            stateTrackingRef.current.completionTriggered = true;
            setIsComplete(true);
            if (onComplete) onComplete();
          }
        }
      }

      setCurrentWord(nextItem || null);
      setWordQueue(remaining);

      // Phase 1.1: ALWAYS persist word updates to database for FSRS algorithm
      // Note: Rating is now calculated in wordUpdateData by convertToFSRSCard
      try {
        await studyWordsFSRSService.updateWordAndReview(userId, rootId, wordUpdateData);
      } catch (error) {
        const errObj =
          error instanceof Error
            ? error
            : new Error((error as { message?: string })?.message ?? JSON.stringify(error));
        handleError(errObj, { toastType: ToastType.IMPORTANT });
      }

      stateTrackingRef.current.isProcessingUpdate = false;

      // Return the new stability value for metrics tracking
      return newCard.stability;
    },
    [
      userId,
      currentWord,
      isComplete,
      convertToFSRSCard,
      fsrsInstance,
      onComplete,
      getNextWordWithSpacing,
      updateSpacingCounters,
      _sessionCooldownHours,
    ],
  );

  const resetQueue = useCallback(() => {
    stateTrackingRef.current.queueInitialized = false;
    setWordQueue([]);
    setCurrentWord(null);
    setProgress(0);
    setIsComplete(false);
    stateTrackingRef.current.completionTriggered = false;
    stateTrackingRef.current.isProcessingUpdate = false;
    countersRef.current = {
      totalWords: 0,
      processedWords: 0,
      knownWords: 0,
      uniqueWords: new Set<RootId>(),
    };
    queueRef.current = new PriorityQueue<StudyWord>();
    spacingQueueRef.current = createSpacingState();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up completion timer (Phase 2.2: initTimeoutRef removed)
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }

      // Reset state
      resetQueue();
    };
  }, [resetQueue]);

  const invalidateQueries = useCallback(() => {
    if (!userId) return;

    // Invalidate all FSRS-related queries to ensure cache consistency
    fsrsQueries.invalidateAll(queryClient, userId);

    stateTrackingRef.current.queueInitialized = false;
    queueRef.current = new PriorityQueue<StudyWord>();
    spacingQueueRef.current = createSpacingState();
  }, [queryClient, userId]);

  return {
    currentWord,
    wordQueue,
    isLoading,
    isComplete,
    progress,
    updateWord,
    invalidateQueries,
    resetQueue,
  };
}
