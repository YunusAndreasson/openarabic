import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Card, StepUnit } from 'ts-fsrs';
import { createEmptyCard, fsrs, Rating, State, generatorParameters } from 'ts-fsrs';

import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { UseFSRSOptions, UseFSRSResult, FSRSStateTracking } from '@/types/fsrs.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

// Minimum number of intervening words before showing a repeated word
const MIN_WORD_SPACING = 3;
// Maximum search window for position optimization (limits linear scan scope)
const MAX_SEARCH_WINDOW = 10;

// Default learning steps for new and relearning cards (in minutes)
const DEFAULT_LEARNING_STEPS: StepUnit[] = ['1m', '10m'];
const DEFAULT_RELEARNING_STEPS: StepUnit[] = ['5m', '10m'];

// Consolidated counters and tracking data
interface FSRSCounters {
  totalWords: number;
  processedWords: number;
  knownWords: number;
  uniqueWords: Set<number>;
}

// Position tracking for efficient queue management
interface PositionTracker {
  wordPositions: Map<number, number[]>;
  lastInsertPosition: number;
}

// Enhanced state tracking with more fields
interface EnhancedFSRSStateTracking extends FSRSStateTracking {
  completionTriggered: boolean;
  isProcessingUpdate: boolean;
  queueInitialized: boolean;
}

export function useFSRS({ userId, onComplete }: UseFSRSOptions): UseFSRSResult {
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

  // Position tracking for efficient queue management
  const positionTrackerRef = useRef<PositionTracker>({
    wordPositions: new Map(),
    lastInsertPosition: 0,
  });

  // Enhanced state tracking
  const stateTrackingRef = useRef<EnhancedFSRSStateTracking>({
    isProcessingUpdate: false,
    completionTriggered: false,
    queueInitialized: false,
  });

  // Timeouts for queue initialization and completion callbacks
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const queryClient = useQueryClient();

  // Configure FSRS with proper learning steps
  const fsrsParams = useMemo(
    () =>
      generatorParameters({
        learning_steps: DEFAULT_LEARNING_STEPS,
        relearning_steps: DEFAULT_RELEARNING_STEPS,
        request_retention: 0.9, // Target retention rate (90%)
        maximum_interval: 365, // Maximum interval of 1 year
        enable_fuzz: true, // Enable fuzzy intervals
        enable_short_term: true, // Enable short-term learning steps
      }),
    []
  );

  // Create FSRS instance with configured parameters
  const fsrsInstance = useMemo(() => fsrs(fsrsParams), [fsrsParams]);

  const {
    data: dueWords,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dueWords', userId],
    queryFn: async () => {
      if (!userId) return [];
      return studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true, limit: 50 });
    },
    enabled: !!userId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Initialize queue when due words are fetched
  useEffect(() => {
    if (!dueWords || stateTrackingRef.current.queueInitialized) return;

    // Set initialized flag first to prevent multiple initializations
    stateTrackingRef.current.queueInitialized = true;

    // Batch updates via setTimeout to separate render cycles
    initTimeoutRef.current = setTimeout(() => {
      if (dueWords.length > 0) {
        countersRef.current.totalWords = dueWords.length;
        countersRef.current.uniqueWords = new Set(dueWords.map(word => word.root_id));
        countersRef.current.processedWords = 0;
        countersRef.current.knownWords = 0;

        // Set all state in a predictable order
        setProgress(0);
        setIsComplete(false);
        stateTrackingRef.current.completionTriggered = false;
        stateTrackingRef.current.isProcessingUpdate = false;
        setWordQueue(dueWords);
        setCurrentWord(dueWords[0] ?? null);
        // Initialize position tracker with new queue
        updatePositionTracker(dueWords);
      } else if (!isLoading) {
        setIsComplete(true);
        if (onComplete && !stateTrackingRef.current.completionTriggered) {
          stateTrackingRef.current.completionTriggered = true;
          // Further delay the completion callback
          completionTimeoutRef.current = setTimeout(() => {
            onComplete();
          }, 50);
        }
      }
    }, 0);

    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    };
  }, [dueWords, isLoading, onComplete]);

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

  // Helper function to update position tracking when queue changes
  const updatePositionTracker = useCallback((queue: StudyWord[]) => {
    const tracker = positionTrackerRef.current;
    tracker.wordPositions.clear();

    queue.forEach((word, index) => {
      const positions = tracker.wordPositions.get(word.root_id);
      if (positions) {
        positions.push(index);
      } else {
        tracker.wordPositions.set(word.root_id, [index]);
      }
    });
  }, []);

  // Optimized helper function to find optimal position for word reinsertions
  const findOptimalPosition = useCallback((queue: StudyWord[], wordToInsert: StudyWord): number => {
    const currentRootId = wordToInsert.root_id;

    // If queue is empty or has only one item, just append
    if (queue.length <= 1) {
      positionTrackerRef.current.lastInsertPosition = queue.length;
      return queue.length;
    }

    // Use position tracker for efficient lookup
    const tracker = positionTrackerRef.current;
    const existingPositions = tracker.wordPositions.get(currentRootId) || [];

    // Start with minimum spacing or slightly after last insert position for distribution
    const basePosition = Math.max(
      MIN_WORD_SPACING,
      Math.min(tracker.lastInsertPosition + 2, queue.length)
    );

    // If no existing positions, use base position
    if (existingPositions.length === 0) {
      const finalPosition = Math.min(basePosition, queue.length);
      tracker.lastInsertPosition = finalPosition;
      return finalPosition;
    }

    // Find first available position that maintains minimum spacing
    // Limit search to a reasonable window to avoid linear scan of entire queue
    const searchEnd = Math.min(basePosition + MAX_SEARCH_WINDOW, queue.length);

    for (let pos = basePosition; pos <= searchEnd; pos++) {
      // Check if this position maintains minimum spacing from existing positions
      const hasConflict = existingPositions.some(
        existingPos => Math.abs(pos - existingPos) < MIN_WORD_SPACING
      );

      if (!hasConflict) {
        tracker.lastInsertPosition = pos;
        return Math.min(pos, queue.length);
      }
    }

    // Fallback: if no good position found in search window, append to end
    const fallbackPosition = queue.length;
    tracker.lastInsertPosition = fallbackPosition;
    return fallbackPosition;
  }, []);

  const updateWord = useCallback(
    async (rootId: number, confidence: 'known' | 'unknown' | 'vague') => {
      if (!userId || !currentWord || currentWord.root_id !== rootId) return;

      if (
        isComplete ||
        stateTrackingRef.current.completionTriggered ||
        stateTrackingRef.current.isProcessingUpdate
      )
        return;

      stateTrackingRef.current.isProcessingUpdate = true;

      try {
        const card = convertToFSRSCard(currentWord);
        const now = new Date();

        const rating =
          confidence === 'known'
            ? Rating.Good
            : confidence === 'vague'
              ? Rating.Hard
              : Rating.Again;

        const { card: newCard } = fsrsInstance.next(card, now, rating);

        // Update the word with new FSRS parameters and session tracking
        const wordUpdateData = {
          success_streak: confidence === 'known' ? (currentWord.success_streak || 0) + 1 : 0,
          difficulty: currentWord.difficulty,
          fsrs_due: newCard.due.toISOString(),
          fsrs_stability: newCard.stability,
          fsrs_difficulty: newCard.difficulty,
          fsrs_elapsed_days: newCard.elapsed_days,
          fsrs_scheduled_days: newCard.scheduled_days,
          fsrs_learning_steps: newCard.learning_steps,
          fsrs_reps: newCard.reps,
          fsrs_lapses: newCard.lapses,
          fsrs_state: newCard.state,
          fsrs_last_review: new Date().toISOString(),
        };

        await studyWordsFSRSService.updateFSRSWord(userId, rootId, wordUpdateData);
        await studyWordsFSRSService.recordFSRSReview(
          userId,
          rootId,
          rating,
          newCard.learning_steps
        );

        // Update the queue based on the user's response
        setWordQueue(prevQueue => {
          countersRef.current.processedWords += 1;
          let newQueue: StudyWord[] = [];

          if (confidence === 'known') {
            // If the word is marked as known, remove it from the queue
            newQueue = prevQueue.filter((_, index) => index !== 0);
            countersRef.current.knownWords += 1;
          } else {
            // For "vague" or "unknown", move the word to an optimal position in the queue
            const [firstWord, ...remainingWords] = prevQueue;

            if (firstWord) {
              // Create a copy of the current word with updated properties
              const updatedWord: StudyWord = {
                ...firstWord,
                // Update only the properties that have changed
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

              // Find optimal position for reinsertion
              const insertPosition = findOptimalPosition(remainingWords, updatedWord);

              // Insert the word at the optimal position
              newQueue = [
                ...remainingWords.slice(0, insertPosition),
                updatedWord,
                ...remainingWords.slice(insertPosition),
              ];
            } else {
              newQueue = remainingWords;
            }
          }

          // Calculate progress based on known words vs total unique words
          const uniqueWordCount = countersRef.current.uniqueWords.size;
          const newProgress = uniqueWordCount
            ? Math.min(Math.round((countersRef.current.knownWords / uniqueWordCount) * 100), 100)
            : 100;
          setProgress(newProgress);

          // Check if queue is empty to trigger completion
          if (newQueue.length === 0) {
            if (!stateTrackingRef.current.completionTriggered) {
              stateTrackingRef.current.completionTriggered = true;
              // Use setTimeout instead of requestAnimationFrame to better separate updates
              setTimeout(() => {
                if (stateTrackingRef.current.completionTriggered) {
                  setIsComplete(true);
                  if (onComplete) onComplete();
                }
              }, 0);
            }
          } else {
            setCurrentWord(newQueue[0] ?? null);
          }

          // Update position tracker with new queue state
          updatePositionTracker(newQueue);
          return newQueue;
        });
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        stateTrackingRef.current.isProcessingUpdate = false;
      }
    },
    [
      userId,
      currentWord,
      isComplete,
      convertToFSRSCard,
      fsrsInstance,
      onComplete,
      findOptimalPosition,
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
    // Reset position tracker
    positionTrackerRef.current = {
      wordPositions: new Map(),
      lastInsertPosition: 0,
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return resetQueue;
  }, [resetQueue]);

  const invalidateQueries = useCallback(() => {
    if (!userId) return;

    const queryKeys = [['dueWords', userId], ['studyWords', userId], ['vocabularyStats']];
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.removeQueries({ queryKey: key });
    });

    stateTrackingRef.current.queueInitialized = false;
    // Reset position tracker when invalidating queries
    positionTrackerRef.current = {
      wordPositions: new Map(),
      lastInsertPosition: 0,
    };
  }, [queryClient, userId]);

  return {
    currentWord,
    wordQueue,
    isLoading,
    isComplete,
    progress,
    updateWord,
    invalidateQueries,
    refetchDueWords: refetch,
    resetQueue,
  };
}
