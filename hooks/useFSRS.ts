import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createEmptyCard, fsrs, Rating, Card, State } from 'ts-fsrs';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { supabase } from '@/services/supabase';

// Interface for our word data combined with FSRS card data
interface StudyWord {
  sentence_word_id: number;
  user_id: string;
  sentence_word: {
    id: number;
    word_form: string;
    english: string;
    root_id: number;
    word_type_id: number;
    position: number;
    sentence_id: number;
    root?: {
      id: number;
      letters: string;
      meaning: string;
    };
    word_type?: {
      id: number;
      name: string;
    };
  };
  // FSRS fields
  fsrs_due: string;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_elapsed_days: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_last_review: string | null;
  // Other fields
  success_streak?: number;
  failure_streak?: number;
}

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
        console.error('Error fetching due words:', error);
        throw error;
      }
    },
    enabled: !!userId,
  });

  // Initialize the queue with due words
  useEffect(() => {
    if (dueWords && dueWords.length > 0) {
      setWordQueue(dueWords);
      totalWordsRef.current = dueWords.length;
      processedWordsRef.current = 0;
      setProgress(0);
      setIsComplete(false);
      completionTriggeredRef.current = false;
      isProcessingUpdateRef.current = false;

      // Set the first word
      setCurrentWord(dueWords[0]);
    } else if (dueWords && dueWords.length === 0 && !isLoading) {
      setIsComplete(true);
      if (onComplete && !completionTriggeredRef.current) {
        completionTriggeredRef.current = true;
        onComplete();
      }
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

  // Update the word in the database based on swipe direction
  const updateWord = useCallback(
    async (sentenceWordId: number, success: boolean) => {
      // Basic validation
      if (!userId || !currentWord) {
        console.error('Cannot update word: userId or currentWord is missing');
        return;
      }

      if (currentWord.sentence_word_id !== sentenceWordId) {
        console.error(`Word ID mismatch: ${currentWord.sentence_word_id} vs ${sentenceWordId}`);
        return;
      }

      if (isComplete || completionTriggeredRef.current || isProcessingUpdateRef.current) {
        return;
      }

      isProcessingUpdateRef.current = true;

      try {
        const card = convertToFSRSCard(currentWord);
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
        const { card: newCard, log } = result;
        const lastReview = now.toISOString();

        console.log(
          `FSRS calculation complete - new stability: ${newCard.stability}, new state: ${newCard.state}, new reps: ${newCard.reps}`
        );

        console.log(`Setting fsrs_last_review to: ${lastReview}`);

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

        try {
          // Update the word with FSRS data
          await studyWordsFSRSService.updateFSRSWord(userId, sentenceWordId, wordUpdateData);
          console.log(`Database update successful for word ${sentenceWordId}`);

          // Record the review
          await studyWordsFSRSService.recordFSRSReview(userId, sentenceWordId, rating);
          console.log(`Review record added successfully`);

          // Update streak counters
          const { error: streakError } = await supabase
            .from('study_words')
            .update({
              success_streak: success ? (currentWord.success_streak || 0) + 1 : 0,
              failure_streak: !success ? (currentWord.failure_streak || 0) + 1 : 0,
            })
            .eq('sentence_word_id', sentenceWordId)
            .eq('user_id', userId);

          if (streakError) {
            console.error('Error updating streaks:', streakError);
          }

          // Skip FSRS log storage - Table might not exist in DB schema
          // If you want detailed analytics later, create the fsrs_logs table
        } catch (error) {
          console.error('Error in database operations:', error);
          throw error;
        }

        // Update queue and track progress
        setWordQueue(prevQueue => {
          // Remove the first word (current word)
          const newQueue = prevQueue.filter((_, index) => index !== 0);

          // Update progress
          processedWordsRef.current += 1;
          setProgress(
            Math.min(Math.round((processedWordsRef.current / totalWordsRef.current) * 100), 100)
          );

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
            // Set the next word
            setCurrentWord(newQueue[0]);
          }

          return newQueue;
        });
      } catch (error) {
        console.error('Error in updateWord:', error);
        throw error;
      } finally {
        // Reset processing flag to allow future updates
        isProcessingUpdateRef.current = false;
      }
    },
    [
      currentWord,
      convertToFSRSCard,
      fsrsInstance,
      userId,
      isComplete,
      wordQueue,
      totalWordsRef,
      processedWordsRef,
      onComplete,
    ]
  );

  // Invalidate queries to refresh data
  const invalidateQueries = useCallback(() => {
    if (!userId) return;

    // Force immediate invalidation and remove cached data
    const queryKeys = [['dueWords', userId], ['studyWords', userId], ['vocabularyStats']];

    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.removeQueries({ queryKey: key });
    });
  }, [queryClient, userId]);

  return {
    currentWord,
    isLoading,
    isComplete,
    progress,
    updateWord,
    invalidateQueries,
    refetchDueWords: refetch,
  };
}
