import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from 'ts-fsrs';
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

import {
  DEFAULT_SESSION_COOLDOWN_HOURS,
  FSRS_QUERY_KEYS,
  MIN_WORD_SPACING,
  OPTIMIZED_FSRS_CONFIG,
} from '@/constants/fsrs';
import { strugglingWordsService } from '@/services/strugglingWords';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
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
  useAllWords = false,
  mode,
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
    queryKey: userId
      ? mode === 'spaced'
        ? FSRS_QUERY_KEYS.struggling(userId, 50)
        : useAllWords
        ? FSRS_QUERY_KEYS.allWithCooldown(userId, _sessionCooldownHours)
        : FSRS_QUERY_KEYS.due(userId)
      : mode === 'spaced'
      ? FSRS_QUERY_KEYS.FALLBACK.due
      : useAllWords
      ? FSRS_QUERY_KEYS.FALLBACK.allWithCooldown(_sessionCooldownHours)
      : FSRS_QUERY_KEYS.FALLBACK.due,
    queryFn: async () => {
      if (!userId) return [];

      // Spaced mode uses struggling words with cooldown
      if (mode === 'spaced') {
        return strugglingWordsService.getStrugglingWords(userId, 50, _sessionCooldownHours);
      }

      // Study all or due words; apply cooldown consistently
      const words = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: !useAllWords,
        forStats: false,
        sessionCooldownHours: _sessionCooldownHours,
      });

      // Defensive client-side cooldown filter to prevent recently reviewed words leaking in
      if (useAllWords && _sessionCooldownHours > 0) {
        const nowMs = Date.now();
        const cutoffMs = nowMs - _sessionCooldownHours * 60 * 60 * 1000;
        const normalizeTs = (ts: unknown) => {
          if (typeof ts === 'string') return ts.replace(' ', 'T');
          if (ts instanceof Date) return ts.toISOString();
          return undefined;
        };
        return words.filter(w => {
          const lastStr = normalizeTs(w.fsrs_last_review as unknown);
          const lastMs = lastStr ? Date.parse(lastStr) : 0;
          const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;
          return !isRecentlyReviewed;
        });
      }

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
      .filter((id): id is number => id != null)
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

        // FIXED: Check if any words are actually available (not in cooldown)
        const first = getNextWordWithSpacing();

        if (first) {
          // We have available words, start session
          setCurrentWord(first);
        } else {
          // FIXED: All words are in cooldown or spacing, complete session immediately
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
      const wordUpdateData = {
        success_streak: confidence === 'known' ? (currentWord.success_streak || 0) + 1 : 0,
        fsrs_due: newCard.due.toISOString(),
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
        // For vague/unknown responses, add the word back to the spacing queue now
        const updatedWord: StudyWord = {
          ...currentWord,
          fsrs_due: wordUpdateData.fsrs_due,
          fsrs_stability: wordUpdateData.fsrs_stability,
          fsrs_difficulty: wordUpdateData.fsrs_difficulty,
          fsrs_elapsed_days: wordUpdateData.fsrs_elapsed_days,
          fsrs_scheduled_days: wordUpdateData.fsrs_scheduled_days,
          fsrs_reps: wordUpdateData.fsrs_reps,
          fsrs_learning_steps: wordUpdateData.fsrs_learning_steps,
          fsrs_lapses: wordUpdateData.fsrs_lapses,
          fsrs_state: wordUpdateData.fsrs_state,
          fsrs_last_review: wordUpdateData.fsrs_last_review,
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
        return;
      }

      const totalWordsInSession = countersRef.current.totalWords;
      const newProgress =
        totalWordsInSession > 0
          ? Math.min(
              Math.round((countersRef.current.processedWords / totalWordsInSession) * 100),
              100
            )
          : 0; // Default to 0 when no words are available
      setProgress(newProgress);

      // FIXED: Check for completion when no next word is available AND either:
      // 1. No words in spacing queue, OR
      // 2. All words in spacing queue have remainingSpacing > 0 (can't be shown yet)
      const hasAvailableSpacedWords = spacingQueueRef.current.spacedWords.some(
        item => item.remainingSpacing <= 0
      );

      if (!nextItem) {
        if (hasAvailableSpacedWords) {
          // Try once more after moving ready spaced words back into the queue
          nextItem = getNextWordWithSpacing();
        }
        // If still no item and no spaced words are ready, complete session
        if (!nextItem && !hasAvailableSpacedWords) {
          if (!stateTrackingRef.current.completionTriggered) {
            stateTrackingRef.current.completionTriggered = true;
            // FIXED: Set completion immediately instead of using setTimeout
            setIsComplete(true);
            if (onComplete) onComplete();
          }
        }
      }

      setCurrentWord(nextItem || null);
      setWordQueue(remaining);

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
        handleError(errObj, { toastType: 'important' });
      }

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

    // Invalidate the specific query type we're using
    if (mode === 'spaced') {
      // Struggling words session
      queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.struggling(userId, 50) });
    } else {
      const currentQueryKey = useAllWords
        ? FSRS_QUERY_KEYS.allWithCooldown(userId, _sessionCooldownHours)
        : FSRS_QUERY_KEYS.due(userId);
      queryClient.invalidateQueries({ queryKey: currentQueryKey });
    }

    // Also invalidate related queries
    queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(userId) });

    stateTrackingRef.current.queueInitialized = false;
    queueRef.current = new PriorityQueue<StudyWord>();
    spacingQueueRef.current = createSpacingState();
  }, [queryClient, userId, useAllWords, mode]);

  return {
    currentWord,
    wordQueue,
    isLoading,
    isComplete,
    progress,
    updateWord,
    invalidateQueries,
  };
}
