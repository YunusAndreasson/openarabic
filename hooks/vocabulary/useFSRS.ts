import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Card, StepUnit } from 'ts-fsrs';
import { createEmptyCard, fsrs, Rating, State, generatorParameters } from 'ts-fsrs';

import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import type { UseFSRSOptions, UseFSRSResult, FSRSStateTracking } from '@/types/fsrs.types';
import type { WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import {
  calculateWordPriority,
  getNextWordWithSpacing as getNextFromSpacingQueue,
  updateSpacingCounters as updateSpacingState,
  createSpacingState,
  MIN_WORD_SPACING,
  type SpacingState,
} from '@/utils/fsrsSpacing';
import { PriorityQueue } from '@/utils/priorityQueue';

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

// Enhanced state tracking with more fields
interface EnhancedFSRSStateTracking extends FSRSStateTracking {
  completionTriggered: boolean;
  isProcessingUpdate: boolean;
  queueInitialized: boolean;
}

// Spacing queue to track recently processed words
type SpacingQueue = SpacingState;

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

  // Timeouts for queue initialization and completion callbacks
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    queryKey: userId ? FSRS_QUERY_KEYS.due(userId) : ['fsrs-words', 'due'],
    queryFn: async () => {
      if (!userId) return [];
      // Remove the 50-word limit to fetch all due words
      return studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true });
    },
    enabled: !!userId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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

        // Reset spacing queue
        spacingQueueRef.current = createSpacingState();

        // Set all state in a predictable order
        setProgress(0);
        setIsComplete(false);
        stateTrackingRef.current.completionTriggered = false;
        stateTrackingRef.current.isProcessingUpdate = false;

        queueRef.current = new PriorityQueue<StudyWord>();

        // Prioritize words by due date and FSRS metrics instead of array index
        dueWords.forEach(word => {
          const priority = calculateWordPriority(word);
          queueRef.current.push(word, priority);
        });

        const ordered = queueRef.current.toArray();
        setWordQueue(ordered);
        const first = getNextWordWithSpacing();
        setCurrentWord(first || null);
      } else {
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
      if (!userId || !currentWord || currentWord.root_id !== rootId) {
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
          fsrs_reps: newCard.reps,
          fsrs_learning_steps: newCard.learning_steps,
          fsrs_lapses: newCard.lapses,
          fsrs_state: newCard.state,
          fsrs_last_review: now.toISOString(),
        };

        await studyWordsFSRSService.updateWordAndReview(
          userId,
          rootId,
          wordUpdateData,
          rating,
          newCard.learning_steps
        );

        // Track session counters
        countersRef.current.processedWords += 1;
        countersRef.current.uniqueWords.add(rootId);

        // Update spacing counters
        updateSpacingCounters(rootId);

        if (confidence === 'known') {
          countersRef.current.knownWords += 1;
        } else {
          // For vague/unknown responses, add the word back to the spacing queue
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

          // Add to spacing queue with proper spacing
          spacingQueueRef.current.spacedWords.push({
            word: updatedWord,
            remainingSpacing: MIN_WORD_SPACING,
          });
        }

        const nextItem = getNextWordWithSpacing();
        const remaining = queueRef.current.toArray();

        const uniqueWordCount = countersRef.current.uniqueWords.size;
        const newProgress = uniqueWordCount
          ? Math.min(Math.round((countersRef.current.knownWords / uniqueWordCount) * 100), 100)
          : 100;
        setProgress(newProgress);

        if (!nextItem && spacingQueueRef.current.spacedWords.length === 0) {
          if (!stateTrackingRef.current.completionTriggered) {
            stateTrackingRef.current.completionTriggered = true;
            setTimeout(() => {
              if (stateTrackingRef.current.completionTriggered) {
                setIsComplete(true);
                if (onComplete) onComplete();
              }
            }, 0);
          }
        }

        setCurrentWord(nextItem || null);
        setWordQueue(remaining);
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
    return resetQueue;
  }, [resetQueue]);

  const invalidateQueries = useCallback(() => {
    if (!userId) return;

    const queryKeys = [
      FSRS_QUERY_KEYS.due(userId),
      FSRS_QUERY_KEYS.all(userId),
      ['vocabulary-stats'],
    ];
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.removeQueries({ queryKey: key });
    });

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
    refetchDueWords: refetch,
    resetQueue,
  };
}
