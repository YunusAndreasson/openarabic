import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Card } from 'ts-fsrs';
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

import { studyWordsService } from '@/services/studyWords';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { UseFSRSOptions, UseFSRSResult, FSRSStateTracking } from '@/types/fsrs.types';
import type { StudyWord } from '@/types/vocabulary.types';

// Minimum number of intervening words before showing a repeated word
const MIN_WORD_SPACING = 3;

export function useFSRS({ userId, onComplete }: UseFSRSOptions): UseFSRSResult {
  const [wordQueue, setWordQueue] = useState<StudyWord[]>([]);
  const [currentWord, setCurrentWord] = useState<StudyWord | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  const totalWordsRef = useRef<number>(0);
  const processedWordsRef = useRef<number>(0);
  const knownWordsRef = useRef<number>(0);
  const uniqueWordsRef = useRef<Set<number>>(new Set());
  const stateTrackingRef = useRef<FSRSStateTracking>({
    isProcessingUpdate: false,
    completionTriggered: false,
    queueInitialized: false,
  });

  const queryClient = useQueryClient();
  const fsrsInstance = useMemo(() => fsrs(), []);

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

  useEffect(() => {
    if (!dueWords || stateTrackingRef.current.queueInitialized) return;

    if (dueWords.length > 0) {
      setWordQueue(dueWords);
      totalWordsRef.current = dueWords.length;
      uniqueWordsRef.current = new Set(dueWords.map(word => word.root_id));
      processedWordsRef.current = 0;
      knownWordsRef.current = 0;
      setProgress(0);
      setIsComplete(false);
      stateTrackingRef.current.completionTriggered = false;
      stateTrackingRef.current.isProcessingUpdate = false;
      setCurrentWord(dueWords[0] ?? null);
    } else if (!isLoading) {
      setIsComplete(true);
      if (onComplete && !stateTrackingRef.current.completionTriggered) {
        stateTrackingRef.current.completionTriggered = true;
        onComplete();
      }
    }

    stateTrackingRef.current.queueInitialized = true;
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
      difficulty: word.fsrs_difficulty ?? 0.3,
      elapsed_days: word.fsrs_elapsed_days ?? 0,
      scheduled_days: word.fsrs_scheduled_days ?? 0,
      reps: word.fsrs_reps ?? 0,
      lapses: word.fsrs_lapses ?? 0,
      state: word.fsrs_state ?? State.New,
      last_review: word.fsrs_last_review ? new Date(word.fsrs_last_review) : undefined,
    };
  }, []);

  // Helper function to find optimal position for word reinsertions
  const findOptimalPosition = useCallback((queue: StudyWord[], wordToInsert: StudyWord): number => {
    const currentRootId = wordToInsert.root_id;

    // If queue is empty or has only one item, just append
    if (queue.length <= 1) {
      return queue.length;
    }

    // Start with the minimum spacing
    let targetPosition = Math.min(MIN_WORD_SPACING, queue.length);

    // Check if placing at minimum spacing would lead to another instance of the same word too close
    for (let i = targetPosition - 1; i <= targetPosition + 1; i++) {
      if (i < queue.length && queue[i]?.root_id === currentRootId) {
        // If we would be too close to another instance of the same word,
        // move further out if possible
        targetPosition = Math.min(i + MIN_WORD_SPACING, queue.length);
        break;
      }
    }

    // Cap at queue length
    return Math.min(targetPosition, queue.length);
  }, []);

  const updateWord = useCallback(
    async (rootId: number, confidence: 'known' | 'vague' | 'unknown') => {
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
          card.state === State.New ||
          card.state === State.Learning ||
          card.state === State.Relearning
            ? confidence === 'known'
              ? Rating.Good
              : confidence === 'vague'
                ? Rating.Hard
                : Rating.Again
            : confidence === 'known'
              ? Rating.Good
              : confidence === 'vague'
                ? Rating.Hard
                : Rating.Again;

        const { card: newCard } = fsrsInstance.next(card, now, rating);
        const lastReview = now.toISOString();

        const wordUpdateData = {
          fsrs_due: newCard.due.toISOString(),
          fsrs_stability: newCard.stability,
          fsrs_difficulty: newCard.difficulty,
          fsrs_elapsed_days: newCard.elapsed_days,
          fsrs_scheduled_days: newCard.scheduled_days,
          fsrs_reps: newCard.reps,
          fsrs_lapses: newCard.lapses,
          fsrs_state: newCard.state,
          fsrs_last_review: lastReview,
        };

        await studyWordsFSRSService.updateFSRSWord(userId, rootId, wordUpdateData);
        await studyWordsFSRSService.recordFSRSReview(userId, rootId, rating);

        await studyWordsService.updateWordReview(rootId, {
          success_streak: confidence === 'known' ? (currentWord.success_streak || 0) + 1 : 0,
          failure_streak: confidence === 'unknown' ? (currentWord.failure_streak || 0) + 1 : 0,
          interval_days: currentWord.interval_days,
          ease_factor: currentWord.ease_factor,
          next_review_at: currentWord.next_review_at,
          review_count: currentWord.review_count,
          lapses: currentWord.lapses,
          stability: currentWord.stability,
          previous_interval: currentWord.previous_interval,
        });

        setWordQueue(prevQueue => {
          processedWordsRef.current += 1;
          let newQueue: StudyWord[] = [];

          if (confidence === 'known') {
            // If the word is marked as known, remove it from the queue
            newQueue = prevQueue.filter((_, index) => index !== 0);
            knownWordsRef.current += 1;
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
          const newProgress = Math.min(
            Math.round((knownWordsRef.current / uniqueWordsRef.current.size) * 100),
            100
          );
          setProgress(newProgress);

          if (newQueue.length === 0) {
            if (!stateTrackingRef.current.completionTriggered) {
              stateTrackingRef.current.completionTriggered = true;
              requestAnimationFrame(() => {
                setIsComplete(true);
                onComplete?.();
              });
            }
          } else {
            setCurrentWord(newQueue[0] ?? null);
          }

          return newQueue;
        });
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
    totalWordsRef.current = 0;
    processedWordsRef.current = 0;
    knownWordsRef.current = 0;
    uniqueWordsRef.current = new Set();
  }, []);

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
