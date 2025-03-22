import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createEmptyCard, fsrs, Rating, Card, RecordLogItem, State } from 'ts-fsrs';

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
  const [currentWord, setCurrentWord] = useState<StudyWord | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const queue = useRef<StudyWord[]>([]);
  const totalWordsRef = useRef<number>(0);
  const processedWordsRef = useRef<number>(0);
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

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('study_words')
        .select(
          `
          *,
          sentence_word:sentence_words (
            *,
            root:roots (*),
            word_type:word_types (*)
          )
        `
        )
        .eq('user_id', userId)
        .lte('fsrs_due', now)
        .order('fsrs_due', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching due words:', error);
        throw error;
      }

      return data as StudyWord[];
    },
    enabled: !!userId,
  });

  // Initialize the queue with due words
  useEffect(() => {
    if (dueWords && dueWords.length > 0) {
      queue.current = [...dueWords];
      totalWordsRef.current = dueWords.length;
      processedWordsRef.current = 0;
      setProgress(0);
      setIsComplete(false);

      // Set the first word
      setCurrentWord(queue.current[0]);
    } else if (dueWords && dueWords.length === 0 && !isLoading) {
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  }, [dueWords, isLoading, onComplete]);

  // Convert database word to FSRS Card
  const convertToFSRSCard = useCallback((word: StudyWord): Card => {
    return {
      due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      stability: word.fsrs_stability || 0,
      difficulty: word.fsrs_difficulty || 0.3,
      elapsed_days: word.fsrs_elapsed_days || 0,
      scheduled_days: word.fsrs_scheduled_days || 0,
      reps: word.fsrs_reps || 0,
      lapses: word.fsrs_lapses || 0,
      state: word.fsrs_state || State.New,
      last_review: word.fsrs_last_review ? new Date(word.fsrs_last_review) : undefined,
    };
  }, []);

  // Update the word in the database based on swipe direction
  const updateWord = useCallback(
    async (sentenceWordId: number, success: boolean) => {
      if (!userId || !currentWord) return;

      // Prevent updating if we've already started the completion process
      if (isComplete) {
        console.log('Review already completed, ignoring update');
        return;
      }

      try {
        // Convert current word to FSRS Card
        const card = convertToFSRSCard(currentWord);
        const now = new Date();

        console.log(
          `Updating word ${sentenceWordId}, success: ${success}, current reps: ${currentWord.fsrs_reps}, current state: ${currentWord.fsrs_state}`
        );

        // Get appropriate rating based on gesture
        // Right swipe (success) = Good
        // Left swipe (failure) = Again
        // This follows ts-fsrs convention where:
        // Again = completely forgot (rating 1)
        // Hard = remembered with difficulty (rating 2)
        // Good = remembered (rating 3)
        // Easy = remembered easily (rating 4)
        const rating = success ? Rating.Good : Rating.Again;

        // Get all possible next states from FSRS
        const states = fsrsInstance.repeat(card, now);

        // Extract the specific next state based on rating
        const result = states[rating];
        const { card: newCard, log } = result;

        console.log(
          `FSRS calculation complete - new stability: ${newCard.stability}, new state: ${newCard.state}, new reps: ${newCard.reps}`
        );

        // Make sure we're setting the last_review timestamp
        const lastReview = now.toISOString();
        console.log(`Setting fsrs_last_review to: ${lastReview}`);

        // Update the database with the new FSRS state
        const { error } = await supabase
          .from('study_words')
          .update({
            fsrs_due: newCard.due.toISOString(),
            fsrs_stability: newCard.stability,
            fsrs_difficulty: newCard.difficulty,
            fsrs_elapsed_days: newCard.elapsed_days,
            fsrs_scheduled_days: newCard.scheduled_days,
            fsrs_reps: newCard.reps,
            fsrs_lapses: newCard.lapses,
            fsrs_state: newCard.state,
            fsrs_last_review: lastReview, // Make sure to set this correctly
            // Update streak counters
            success_streak: success ? (currentWord.success_streak || 0) + 1 : 0,
            failure_streak: !success ? (currentWord.failure_streak || 0) + 1 : 0,
          })
          .eq('sentence_word_id', sentenceWordId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating word:', error);
          throw error;
        }

        console.log(`Database update successful for word ${sentenceWordId}`);

        // Add review record
        const { error: reviewError } = await supabase.from('reviews').insert({
          user_id: userId,
          sentence_word_id: sentenceWordId,
          grade: rating, // Store the actual FSRS rating
          reviewed_at: lastReview, // Use the same timestamp for consistency
        });

        if (reviewError) {
          console.error('Error recording review:', reviewError);
        } else {
          console.log(`Review record added successfully`);
        }

        // Remove current word from queue and update progress
        queue.current.shift();
        processedWordsRef.current += 1;

        // Calculate and update progress
        const newProgress = Math.round((processedWordsRef.current / totalWordsRef.current) * 100);
        setProgress(newProgress);

        // Check if this was the last word
        const isLastWord = queue.current.length === 0;

        // Set next word or complete
        if (!isLastWord) {
          setCurrentWord(queue.current[0]);
        } else {
          // Only trigger completion once
          if (!isComplete) {
            setIsComplete(true);
            if (onComplete) {
              onComplete();
            }
          }
        }

        return result;
      } catch (error) {
        console.error('Error in updateWord:', error);
        throw error;
      }
    },
    [userId, currentWord, convertToFSRSCard, fsrsInstance, onComplete, isComplete]
  );

  // Invalidate queries to refresh data
  const invalidateQueries = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', userId] });
      queryClient.invalidateQueries({ queryKey: ['studyWords', userId] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    }
  }, [userId, queryClient]);

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
