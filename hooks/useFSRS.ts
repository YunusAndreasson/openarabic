import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Card } from 'ts-fsrs';
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

import { studyWordsService } from '@/services/studyWords';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';

interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
}

type UseFSRSResult = {
  currentWord: StudyWord | null;
  wordQueue: StudyWord[];
  isLoading: boolean;
  isComplete: boolean;
  progress: number;
  updateWord: (rootId: number, confidence: 'known' | 'vague' | 'unknown') => Promise<void>;
  invalidateQueries: () => void;
  refetchDueWords: () => Promise<unknown>;
  resetQueue: () => void;
};

export function useFSRS({ userId, onComplete }: UseFSRSOptions): UseFSRSResult {
  // Use React state for queue to improve concurrency safety
  const [wordQueue, setWordQueue] = useState<StudyWord[]>([]);
  const [currentWord, setCurrentWord] = useState<StudyWord | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  // Keep these as refs since they're just for tracking
  const totalWordsRef = useRef<number>(0);
  const processedWordsRef = useRef<number>(0);

  // Consolidate state tracking into a single ref
  const stateTrackingRef = useRef({
    isProcessingUpdate: false,
    completionTriggered: false,
    queueInitialized: false,
  });

  const queryClient = useQueryClient();

  // Initialize FSRS algorithm with standard parameters
  // This properly creates the FSRS scheduler with default weights
  const fsrsInstance = useMemo(() => fsrs(), []);

  // Fetch due words
  const {
    data: dueWords,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dueWords', userId],
    queryFn: async () => {
      if (!userId) return [];
      const data = await studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true, limit: 50 });
      return data;
    },
    enabled: !!userId,
    // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Initialize the queue with due words - but only once
  useEffect(() => {
    // Only initialize once per session
    if (dueWords && dueWords.length > 0 && !stateTrackingRef.current.queueInitialized) {
      setWordQueue(dueWords);
      totalWordsRef.current = dueWords.length;
      processedWordsRef.current = 0;
      setProgress(0);
      setIsComplete(false);
      stateTrackingRef.current.completionTriggered = false;
      stateTrackingRef.current.isProcessingUpdate = false;

      // Set the first word
      setCurrentWord(dueWords[0] ?? null);
      stateTrackingRef.current.queueInitialized = true;
    } else if (
      dueWords &&
      dueWords.length === 0 &&
      !isLoading &&
      !stateTrackingRef.current.queueInitialized
    ) {
      setIsComplete(true);
      if (onComplete && !stateTrackingRef.current.completionTriggered) {
        stateTrackingRef.current.completionTriggered = true;
        onComplete();
      }
      stateTrackingRef.current.queueInitialized = true;
    }
  }, [dueWords, isLoading, onComplete]);

  // Convert database word to FSRS Card - simplified implementation
  const convertToFSRSCard = useCallback((word: StudyWord): Card => {
    // Use createEmptyCard for new cards
    if (!word.fsrs_reps && !word.fsrs_stability && !word.fsrs_last_review) {
      const emptyCard = createEmptyCard(new Date());
      return {
        ...emptyCard,
        due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      };
    }

    // For existing cards, use stored values with fallbacks
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

  // Update the word in the database based on confidence level
  const updateWord = useCallback(
    async (rootId: number, confidence: 'known' | 'vague' | 'unknown') => {
      // Basic validation
      if (!userId || !currentWord) {
        return;
      }

      // Ensure we match current entry
      if (currentWord.root_id !== rootId) {
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
        // Get the current word
        const word = currentWord;

        // Convert database word to FSRS Card
        const card = convertToFSRSCard(word);
        const now = new Date();

        // Determine appropriate rating based on card state and confidence
        let rating: Rating;
        if (
          card.state === State.New ||
          card.state === State.Learning ||
          card.state === State.Relearning
        ) {
          // For new/learning cards
          if (confidence === 'known') {
            rating = Rating.Good;
          } else if (confidence === 'vague') {
            rating = Rating.Hard; // Hard indicates partial knowledge
          } else {
            rating = Rating.Again;
          }
        } else {
          // For review cards
          if (confidence === 'known') {
            rating = Rating.Good;
          } else if (confidence === 'vague') {
            rating = Rating.Hard; // Hard indicates partial knowledge
          } else {
            rating = Rating.Again;
          }
        }

        // Get next card state from FSRS
        const result = fsrsInstance.next(card, now, rating);
        const { card: newCard } = result;
        const lastReview = now.toISOString();

        // Prepare update data from FSRS calculation result
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

        // Update the word with FSRS data
        await studyWordsFSRSService.updateFSRSWord(userId, rootId, wordUpdateData);

        // Record the review
        await studyWordsFSRSService.recordFSRSReview(userId, rootId, rating);

        // Update streak counters - only increment success streak for 'known'
        await studyWordsService.updateWordReview(rootId, {
          success_streak: confidence === 'known' ? (word.success_streak || 0) + 1 : 0,
          failure_streak: confidence === 'unknown' ? (word.failure_streak || 0) + 1 : 0,
          interval_days: word.interval_days,
          ease_factor: word.ease_factor,
          next_review_at: word.next_review_at,
          review_count: word.review_count,
          lapses: word.lapses,
          stability: word.stability,
          previous_interval: word.previous_interval,
        });

        // Update queue and track progress
        setWordQueue(prevQueue => {
          // Remove the first word (current word)
          const newQueue = prevQueue.filter((_, index) => index !== 0);

          // Update progress
          processedWordsRef.current += 1;
          const newProgress = Math.min(
            Math.round((processedWordsRef.current / totalWordsRef.current) * 100),
            100
          );
          setProgress(newProgress);

          // Check if all words are reviewed
          if (newQueue.length === 0) {
            if (!stateTrackingRef.current.completionTriggered) {
              stateTrackingRef.current.completionTriggered = true;
              setTimeout(() => {
                setIsComplete(true);
                if (onComplete) onComplete();
              }, 0);
            }
          } else {
            // Set the next word - do this AFTER the database updates are complete
            const nextWord = newQueue[0] ?? null;
            setCurrentWord(nextWord);
          }

          return newQueue;
        });
      } finally {
        // Reset processing flag to allow future updates
        stateTrackingRef.current.isProcessingUpdate = false;
      }
    },
    [userId, currentWord, isComplete, convertToFSRSCard, fsrsInstance]
  );

  // Reset the queue when the component unmounts or when explicitly called
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
  }, []);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      resetQueue();
    };
  }, [resetQueue]);

  // Invalidate queries to refresh data
  const invalidateQueries = useCallback(() => {
    if (!userId) return;

    // Force immediate invalidation and remove cached data
    const queryKeys = [['dueWords', userId], ['studyWords', userId], ['vocabularyStats']];

    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.removeQueries({ queryKey: key });
    });

    // Reset the queue initialization flag to allow a fresh queue to be created next time
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
