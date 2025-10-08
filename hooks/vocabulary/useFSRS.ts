import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from 'ts-fsrs';
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

import {
  DEFAULT_SESSION_COOLDOWN_HOURS,
  FSRS_BASE_KEY,
  FSRS_QUERY_KEYS,
  MIN_WORD_SPACING,
  OPTIMIZED_FSRS_CONFIG,
} from '@/constants/fsrs';
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

// FIXED: Add constant for completion delay to prevent race conditions
const COMPLETION_DELAY_MS = 300;

// Consolidated counters and tracking data
interface FSRSCounters {
  totalWords: number;
  processedWords: number;
  knownWords: number;
  uniqueWords: Set<number>;
}

// Enhanced state tracking with more fields
interface EnhancedFSRSStateTracking extends FSRSStateTracking {
  completionTriggered: boolean;
  isProcessingUpdate: boolean;
  queueInitialized: boolean;
}

// Spacing queue to track recently processed words
type SpacingQueue = SpacingState;

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
    uniqueWords: new Set<number>(),
  });

  // Priority queue for efficient reordering - using proper signature
  const queueRef = useRef<PriorityQueue<StudyWord>>(new PriorityQueue<StudyWord>());

  // Spacing queue to enforce MIN_WORD_SPACING
  const spacingQueueRef = useRef<SpacingQueue>(createSpacingState());

  // Enhanced state tracking
  const stateTrackingRef = useRef<EnhancedFSRSStateTracking>({
    isProcessingUpdate: false,
    completionTriggered: false,
    queueInitialized: false,
  });

  // Track the last initialized set of due words (by root_id signature)
  const lastQueueSignatureRef = useRef<string | null>(null);

  // Timeouts for queue initialization and completion callbacks
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  // Configure FSRS with proper learning steps
  const fsrsParams = useMemo(() => generatorParameters(OPTIMIZED_FSRS_CONFIG), []);

  // Create FSRS instance with configured parameters
  const fsrsInstance = useMemo(() => fsrs(fsrsParams), [fsrsParams]);

  const { data: dueWords, isLoading } = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.due(userId) : FSRS_QUERY_KEYS.FALLBACK.due,
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
    enabled: !!userId,
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

  // Initialize queue when due words are fetched (after loading) and re-init if the set changes
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

    // Clear any existing timeouts before setting new ones
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }

    // Initialize queue based on current due words
    initTimeoutRef.current = setTimeout(() => {
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
        // FIXED: Only complete if there are truly no words available
        setIsComplete(true);
        if (onComplete && !stateTrackingRef.current.completionTriggered) {
          stateTrackingRef.current.completionTriggered = true;
          onComplete();
        }
      }
    }, 0);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, [dueWords, isLoading, onComplete, getNextWordWithSpacing]);

  const convertToFSRSCard = useCallback((word: StudyWord): Card => {
    if (!word.fsrs_reps && !word.fsrs_stability && !word.fsrs_last_review) {
      const emptyCard = createEmptyCard(new Date());
      return {
        ...emptyCard,
        due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      };
    }

    return {
      due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      stability: word.fsrs_stability ?? 0,
      difficulty: word.fsrs_difficulty ?? 6.5,
      elapsed_days: word.fsrs_elapsed_days ?? 0,
      scheduled_days: word.fsrs_scheduled_days ?? 0,
      learning_steps: word.fsrs_learning_steps ?? 0,
      reps: word.fsrs_reps ?? 0,
      lapses: word.fsrs_lapses ?? 0,
      state: word.fsrs_state ?? State.New,
      last_review: word.fsrs_last_review ? new Date(word.fsrs_last_review) : undefined,
    };
  }, []);

  const updateWord = useCallback(
    async (rootId: number, confidence: WordConfidence) => {
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

      const card = convertToFSRSCard(currentWord);
      const now = new Date();

      const rating =
        confidence === 'known' ? Rating.Good : confidence === 'vague' ? Rating.Hard : Rating.Again;

      const { card: newCard } = fsrsInstance.next(card, now, rating);

      // Prepare FSRS update payload
      const shortCooldownMs = 10 * 60 * 1000; // 10 minutes
      const nextDueDate =
        confidence === 'known' ? newCard.due : new Date(now.getTime() + shortCooldownMs);

      const wordUpdateData = {
        fsrs_due: nextDueDate.toISOString(),
        fsrs_stability: newCard.stability,
        fsrs_difficulty: newCard.difficulty,
        fsrs_elapsed_days: newCard.elapsed_days,
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
        // Keep in-memory FSRS state updated but DON'T persist to DB yet
        const updatedWord: StudyWord = {
          ...currentWord,
          // Update in-memory FSRS state for next review in this session
          fsrs_stability: newCard.stability,
          fsrs_difficulty: newCard.difficulty,
          fsrs_elapsed_days: newCard.elapsed_days,
          fsrs_scheduled_days: newCard.scheduled_days,
          fsrs_reps: newCard.reps,
          fsrs_learning_steps: newCard.learning_steps,
          fsrs_lapses: newCard.lapses,
          fsrs_state: newCard.state,
          fsrs_last_review: now.toISOString(),
          // DON'T update fsrs_due - keep original due date for DB persistence later
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
      while (nextItem && nextItem.root_id === rootId && guardIterations < 5) {
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
          item => item.remainingSpacing <= 0
        );

        if (readySpacedWords.length > 0) {
          readySpacedWords.forEach(item => {
            const priority = calculateWordPriority(item.word);
            queueRef.current.push(item.word, priority);
          });

          spacingQueueRef.current.spacedWords = spacingQueueRef.current.spacedWords.filter(
            item => item.remainingSpacing > 0
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
              undefined as (typeof spacingQueueRef.current.spacedWords)[number] | undefined
            );

            if (candidate) {
              // FORCE OVERRIDE: allow immediate repeat of the smallest-spacing candidate
              // Remove from spaced list and from recent guard to avoid skip
              spacingQueueRef.current.spacedWords = spacingQueueRef.current.spacedWords.filter(
                w => w.word.root_id !== candidate.word.root_id
              );
              spacingQueueRef.current.recentWords = spacingQueueRef.current.recentWords.filter(
                id => id !== candidate.word.root_id
              );
              nextItem = candidate.word;
            }
          }

          // If we still have no next item, complete
          if (!nextItem && !stateTrackingRef.current.completionTriggered) {
            stateTrackingRef.current.completionTriggered = true;
            completionTimeoutRef.current = setTimeout(() => {
              setIsComplete(true);
              if (onComplete) onComplete();
            }, COMPLETION_DELAY_MS);
          }
        }
      }

      setCurrentWord(nextItem || null);
      setWordQueue(remaining);

      // CRITICAL FIX: Only persist to database when word is marked as KNOWN
      // Vague/unknown words stay in session-only spacing queue until mastered
      // This prevents vague words from getting 10-min cooldown and disappearing
      if (confidence === 'known') {
        // Persist update; errors won't block UI progression
        try {
          await studyWordsFSRSService.updateWordAndReview(
            userId,
            rootId,
            wordUpdateData,
            rating,
            newCard.learning_steps
          );
        } catch (error) {
          const errObj =
            error instanceof Error
              ? error
              : new Error((error as { message?: string })?.message ?? JSON.stringify(error));
          handleError(errObj, { toastType: ToastType.IMPORTANT });
        }
      }
      // For vague/unknown: word stays in spacing queue, no DB update until known

      stateTrackingRef.current.isProcessingUpdate = false;
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
    ]
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
      uniqueWords: new Set(),
    };
    queueRef.current = new PriorityQueue<StudyWord>();
    spacingQueueRef.current = createSpacingState();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up all timers
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
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

    // Only due-words flow is supported
    queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(userId) });

    // Also invalidate related queries
    queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(userId) });

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
