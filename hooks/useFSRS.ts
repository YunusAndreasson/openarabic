import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createEmptyCard, fsrs, Rating, Card, State } from 'ts-fsrs';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { StudyWord } from '@/types/vocabulary.types';
import { studyWordsService } from '@/services/studyWords';

interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
}

export function useFSRS({ userId, onComplete }: UseFSRSOptions) {
  // Use React state for queue to improve concurrency safety
  const [wordQueue, setWordQueue] = useState<StudyWord[]>([]);
  const [currentWord, setCurrentWord] = useState<StudyWord | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  // Keep these as refs since they're just for tracking
  const totalWordsRef = useRef<number>(0);
  const processedWordsRef = useRef<number>(0);
  // Track if we're currently processing a word update to prevent concurrent updates
  const isProcessingUpdateRef = useRef<boolean>(false);

  // Track if completion has been triggered to prevent duplicate calls
  const completionTriggeredRef = useRef<boolean>(false);

  const queryClient = useQueryClient();

  // Initialize FSRS algorithm with standard parameters
  // This properly creates the FSRS scheduler with default weights
  const fsrsInstance = fsrs();

  // Fetch due words
  const {
    data: dueWords,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dueWords', userId],
    queryFn: async () => {
      if (!userId) return [];

      try {
        const data = await studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true, limit: 50 });
        return data as StudyWord[];
      } catch (error) {
        throw error;
      }
    },
    enabled: !!userId,
    // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0, // No caching
    gcTime: 0, // No cache retention
  });

  // Add a ref to track if the queue has been initialized
  const queueInitializedRef = useRef<boolean>(false);

  // Initialize the queue with due words - but only once
  useEffect(() => {
    // Only initialize once per session
    if (dueWords && dueWords.length > 0 && !queueInitializedRef.current) {
      setWordQueue(dueWords);
      totalWordsRef.current = dueWords.length;
      processedWordsRef.current = 0;
      setProgress(0);
      setIsComplete(false);
      completionTriggeredRef.current = false;
      isProcessingUpdateRef.current = false;

      // Set the first word
      setCurrentWord(dueWords[0]);
      queueInitializedRef.current = true;
    } else if (dueWords && dueWords.length === 0 && !isLoading && !queueInitializedRef.current) {
      setIsComplete(true);
      if (onComplete && !completionTriggeredRef.current) {
        completionTriggeredRef.current = true;
        onComplete();
      }
      queueInitializedRef.current = true;
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

  // Helper function to update word in database
  const updateWordInDatabase = useCallback(
    async (word: StudyWord, success: boolean) => {
      if (!userId) {
        throw new Error('Cannot update word: userId is missing');
      }

      const card = convertToFSRSCard(word);
      const now = new Date();

      // Determine appropriate rating based on card state and success
      let rating: Rating;
      if (
        card.state === State.New ||
        card.state === State.Learning ||
        card.state === State.Relearning
      ) {
        rating = success ? Rating.Hard : Rating.Again;
      } else {
        rating = success ? Rating.Good : Rating.Again;
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
      await studyWordsFSRSService.updateFSRSWord(userId, word.sentence_word_id, wordUpdateData);

      // Record the review
      await studyWordsFSRSService.recordFSRSReview(userId, word.sentence_word_id, rating);

      // Update streak counters
      await studyWordsService.updateWordReview(word.sentence_word_id, {
        success_streak: success ? (word.success_streak || 0) + 1 : 0,
        failure_streak: !success ? (word.failure_streak || 0) + 1 : 0,
        interval_days: word.interval_days,
        ease_factor: word.ease_factor,
        next_review_at: word.next_review_at,
        review_count: word.review_count,
        lapses: word.lapses,
        stability: word.stability,
        previous_interval: word.previous_interval,
      });
    },
    [convertToFSRSCard, fsrsInstance, userId]
  );

  // Update the word in the database based on swipe direction
  const updateWord = useCallback(
    async (sentenceWordId: number, success: boolean) => {
      // Basic validation
      if (!userId || !currentWord) {
        return;
      }

      if (currentWord.sentence_word_id !== sentenceWordId) {
        return;
      }

      if (isComplete || completionTriggeredRef.current || isProcessingUpdateRef.current) {
        return;
      }

      isProcessingUpdateRef.current = true;

      try {
        // Update the word in the database
        await updateWordInDatabase(currentWord, success);

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
            if (!completionTriggeredRef.current) {
              completionTriggeredRef.current = true;
              setTimeout(() => {
                setIsComplete(true);
                if (onComplete) onComplete();
              }, 0);
            }
          } else {
            // Set the next word - do this AFTER the database updates are complete
            const nextWord = newQueue[0];
            setCurrentWord(nextWord);
          }

          return newQueue;
        });
      } catch (error) {
        console.error('[Word Update] Error in word update:', error);
        throw error;
      } finally {
        // Reset processing flag to allow future updates
        isProcessingUpdateRef.current = false;
      }
    },
    [userId, currentWord, isComplete, updateWordInDatabase, onComplete]
  );

  // Reset the queue when the component unmounts or when explicitly called
  const resetQueue = useCallback(() => {
    queueInitializedRef.current = false;
    setWordQueue([]);
    setCurrentWord(null);
    setProgress(0);
    setIsComplete(false);
    completionTriggeredRef.current = false;
    isProcessingUpdateRef.current = false;
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
    queueInitializedRef.current = false;
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
