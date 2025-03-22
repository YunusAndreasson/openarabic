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

  // Initialize the queue with due words - use React state for better concurrency handling
  useEffect(() => {
    if (dueWords && dueWords.length > 0) {
      console.log(`Initializing review session with ${dueWords.length} due words`);
      setWordQueue(dueWords);
      totalWordsRef.current = dueWords.length;
      processedWordsRef.current = 0;
      setProgress(0);
      setIsComplete(false);
      completionTriggeredRef.current = false;
      isProcessingUpdateRef.current = false;

      // Set the first word - it's safe to access dueWords[0] here since we've checked length > 0
      setCurrentWord(dueWords[0]);
      console.log(
        `First word set: ${dueWords[0].sentence_word.word_form}, queue length: ${dueWords.length}`
      );
    } else if (dueWords && dueWords.length === 0 && !isLoading) {
      console.log('No due words found, setting review as complete');
      setIsComplete(true);
      if (onComplete && !completionTriggeredRef.current) {
        completionTriggeredRef.current = true;
        onComplete();
      }
    }
  }, [dueWords, isLoading, onComplete]);

  // Convert database word to FSRS Card
  const convertToFSRSCard = useCallback((word: StudyWord): Card => {
    // Check if this is a new card (no review history)
    if (
      (word.fsrs_reps === 0 || word.fsrs_reps === null || word.fsrs_reps === undefined) &&
      (word.fsrs_stability === 0 ||
        word.fsrs_stability === null ||
        word.fsrs_stability === undefined) &&
      !word.fsrs_last_review
    ) {
      // Use createEmptyCard to get library defaults for a new card
      const emptyCard = createEmptyCard(new Date());

      // Preserve the due date from our database
      return {
        ...emptyCard,
        due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      };
    }

    // For existing cards, use the stored values with fallbacks
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
      // Add validation to ensure we have a valid current word and user ID
      if (!userId || !currentWord) {
        console.error('Cannot update word: userId or currentWord is missing');
        return;
      }

      // Ensure the sentenceWordId matches the current word - this prevents
      // updating words out of sequence if something goes wrong
      if (currentWord.sentence_word_id !== sentenceWordId) {
        console.error(
          `Word ID mismatch: current=${currentWord.sentence_word_id}, trying to update=${sentenceWordId}`
        );
        return;
      }

      // Prevent updating if we've already started the completion process
      if (isComplete || completionTriggeredRef.current) {
        console.log('Review already completed or completion triggered, ignoring update');
        return;
      }

      // Prevent concurrent updates
      if (isProcessingUpdateRef.current) {
        console.warn('Already processing an update, ignoring this request');
        return;
      }

      // Set processing flag
      isProcessingUpdateRef.current = true;

      try {
        // Convert current word to FSRS Card
        const card = convertToFSRSCard(currentWord);
        const now = new Date();

        console.log(
          `Updating word ${sentenceWordId}, success: ${success}, current reps: ${currentWord.fsrs_reps}, current state: ${currentWord.fsrs_state}`
        );

        // Get appropriate rating based on gesture and current state
        let rating: Rating;

        // Handle rating based on card state
        if (
          card.state === State.New ||
          card.state === State.Learning ||
          card.state === State.Relearning
        ) {
          // For new or learning cards, use appropriate learning steps
          if (success) {
            // For success on new/learning cards, use Hard (3) in learning phase instead of Good (4)
            // This ensures proper progression through learning steps
            rating = Rating.Hard;
            console.log(`Using Rating.Hard for new/learning card with success swipe`);
          } else {
            // For failure, always use Again (1)
            rating = Rating.Again;
            console.log(`Using Rating.Again for new/learning card with failure swipe`);
          }
        } else {
          // For regular review cards, use standard ratings
          rating = success ? Rating.Good : Rating.Again;
          console.log(`Using standard rating for review card: ${success ? 'Good' : 'Again'}`);
        }

        // Get all possible next states from FSRS
        const states = fsrsInstance.repeat(card, now);

        // Extract the specific next state based on rating
        const result = states[rating];
        // The result contains a card and a ReviewLog object (not RecordLogItem)
        const { card: newCard, log } = result;

        console.log(
          `FSRS calculation complete - new stability: ${newCard.stability}, new state: ${newCard.state}, new reps: ${newCard.reps}`
        );

        // Make sure we're setting the last_review timestamp
        const lastReview = now.toISOString();
        console.log(`Setting fsrs_last_review to: ${lastReview}`);

        // Prepare update data for database
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
          // Update streak counters
          success_streak: success ? (currentWord.success_streak || 0) + 1 : 0,
          failure_streak: !success ? (currentWord.failure_streak || 0) + 1 : 0,
        };

        // Use upsert with onConflict to handle both new and existing words
        const { error } = await supabase.from('study_words').upsert(
          {
            sentence_word_id: sentenceWordId,
            user_id: userId,
            ...wordUpdateData,
          },
          {
            onConflict: 'sentence_word_id,user_id',
          }
        );

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

        // Store the FSRS log for advanced analytics and debugging
        if (log) {
          const { error: logError } = await supabase.from('fsrs_logs').insert({
            user_id: userId,
            sentence_word_id: sentenceWordId,
            review_date: lastReview,
            rating: rating,
            scheduled_days: log.scheduled_days,
            elapsed_days: log.elapsed_days,
            // Store card state from the result
            card_state: newCard.state,
            card_difficulty: newCard.difficulty,
            card_stability: newCard.stability,
            // Store the complete log data as JSON for future detailed analysis
            log_data: JSON.stringify(log),
          });

          if (logError) {
            console.error('Error storing FSRS log data:', logError);
          } else {
            console.log('FSRS log data stored successfully for analytics');
          }
        }

        // Update the queue and progress tracking - properly manage React state
        if (wordQueue.length > 0) {
          // Update queue by removing the first element
          setWordQueue(prevQueue => {
            const newQueue = [...prevQueue];
            newQueue.shift();
            return newQueue;
          });

          // Update the processed words counter
          processedWordsRef.current += 1;

          // Calculate and update progress - ensure we don't go over 100%
          const newProgress = Math.min(
            Math.round((processedWordsRef.current / totalWordsRef.current) * 100),
            100
          );
          setProgress(newProgress);

          console.log(
            `Progress: ${newProgress}% (${processedWordsRef.current}/${totalWordsRef.current})`
          );

          // Check if we've processed all words - use a closure with the latest state
          setWordQueue(prevQueue => {
            const isQueueEmpty = prevQueue.length <= 1; // Check if this was the last word

            if (isQueueEmpty) {
              console.log('All words reviewed, completing session');
              // Set complete state only once
              if (!isComplete && !completionTriggeredRef.current) {
                console.log('Setting isComplete to true and calling onComplete callback');
                completionTriggeredRef.current = true;
                // Schedule this for the next render to avoid state update conflicts
                setTimeout(() => {
                  setIsComplete(true);
                  if (onComplete) {
                    onComplete();
                  }
                }, 0);
              }
            } else {
              // Set the next word to review
              const nextWord = prevQueue[1]; // Get the next word
              console.log(`Loading next word (${prevQueue.length - 1} remaining)`);
              setCurrentWord(nextWord);
            }
            return prevQueue; // Return unchanged, the shift happens in the previous setWordQueue
          });
        } else {
          // This is a safety check in case the queue is empty but we're still updating words
          console.warn('Queue is empty but trying to update words - forcing completion');
          if (!isComplete && !completionTriggeredRef.current) {
            console.log('Setting isComplete to true from safety condition');
            completionTriggeredRef.current = true;
            setIsComplete(true);
            if (onComplete) {
              onComplete();
            }
          }
        }
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
    console.log('Invalidating queries for user:', userId);

    if (!userId) {
      console.warn('Cannot invalidate queries: userId is undefined');
      return;
    }

    // Force immediate invalidation
    queryClient.invalidateQueries({ queryKey: ['dueWords', userId] });
    queryClient.invalidateQueries({ queryKey: ['studyWords', userId] });
    queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });

    // Also remove any cached data to force a fresh fetch on next query
    console.log('Removing cached queries to force a fresh fetch');
    queryClient.removeQueries({ queryKey: ['dueWords', userId] });
    queryClient.removeQueries({ queryKey: ['studyWords', userId] });
    queryClient.removeQueries({ queryKey: ['vocabularyStats'] });
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
