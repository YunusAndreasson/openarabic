import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyWordsService } from '../services/study_words';

// Types for study words
export interface StudyWord {
  sentence_word_id: string;
  sentence_word: {
    word_form: string;
    english: string;
    sentence?: {
      arabic: string;
    };
  };
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  lapses: number;
}

interface UseSpacedRepetitionProps {
  userId: string | undefined;
  onComplete?: () => void;
}

interface UseSpacedRepetitionReturn {
  dueWords: StudyWord[];
  currentIndex: number;
  currentWord: StudyWord | undefined;
  isLoading: boolean;
  isUpdating: boolean;
  updateWord: (wordId: string, success: boolean) => Promise<void>;
  progress: number;
  isComplete: boolean;
  invalidateQueries: () => void;
  transitionType: 'fade' | 'slide'; // Ensure transitionType is properly exported
}

/**
 * Custom hook for managing spaced repetition logic
 */
export function useSpacedRepetition({
  userId,
  onComplete,
}: UseSpacedRepetitionProps): UseSpacedRepetitionReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [transitionType, setTransitionType] = useState<'fade' | 'slide'>('fade');
  const wordsRef = useRef<StudyWord[]>([]);
  const mountedRef = useRef(true);
  const hasUpdatedWords = useRef(false);
  const queryClient = useQueryClient();

  console.log('[DEBUG-SR] Hook initialized - currentIndex:', currentIndex);

  // Cleanup on unmount
  useEffect(() => {
    // Reset mounted flag to prevent state updates after unmount
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to invalidate queries
  const invalidateQueries = useCallback(() => {
    console.log('[DEBUG-SR] Invalidating queries');
    // More targeted invalidation by using exact query keys
    queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    queryClient.invalidateQueries({ queryKey: ['studyWords', userId] });
    queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    queryClient.invalidateQueries({ queryKey: ['dueWords', userId] });
  }, [queryClient, userId]);

  // Fetch due words - use server-side filtering for better performance
  const { data: dueWords = [], isLoading } = useQuery({
    queryKey: ['dueWords', userId],
    queryFn: async () => {
      console.log('[DEBUG-SR] Fetching due words for user:', userId);
      if (!userId) throw new Error('User ID is required');
      // Use the onlyDue option to filter on the server side
      const words = await studyWordsService.getStudyWords(userId, { onlyDue: true });
      console.log('[DEBUG-SR] Fetched', words.length, 'due words');

      // Server already filtered for due words, so we just need to sort
      if (words.length > 1) {
        words.sort((a, b) => {
          // Use cached timestamp values to avoid redundant Date object creation
          const dateA = new Date(a.next_review_at).getTime();
          const dateB = new Date(b.next_review_at).getTime();
          return dateA - dateB;
        });
        console.log('[DEBUG-SR] Sorted words by review date');
      }

      return words;
    },
    enabled: !!userId,
    // Improve caching strategy
    staleTime: 60 * 1000, // 1 minute before considering stale
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (React Query v5 uses gcTime instead of cacheTime)
    retry: 3, // Retry failed requests 3 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  useEffect(() => {
    if (dueWords && Array.isArray(dueWords)) {
      console.log('[DEBUG-SR] Updating wordsRef with', dueWords.length, 'words');
      wordsRef.current = [...dueWords] as StudyWord[];
    }
  }, [dueWords]);

  // Calculate if review is complete
  const isComplete = useMemo(
    () => currentIndex >= dueWords.length && dueWords.length > 0,
    [currentIndex, dueWords.length]
  );

  // Calculate progress percentage
  const progress = useMemo(
    () => (dueWords.length > 0 ? (currentIndex / dueWords.length) * 100 : 0),
    [currentIndex, dueWords.length]
  );

  // Get current word with safety check to prevent "error loading word"
  const currentWord = useMemo(() => {
    const word = currentIndex < dueWords.length ? dueWords[currentIndex] : undefined;
    console.log(
      '[DEBUG-SR] Current word updated:',
      word?.sentence_word_id,
      'at index:',
      currentIndex
    );
    return word;
  }, [currentIndex, dueWords]);

  // Word update mutation
  const updateWordMutation = useMutation({
    mutationFn: async ({
      wordId,
      success,
      wordToUpdate,
    }: {
      wordId: string;
      success: boolean;
      wordToUpdate: StudyWord;
    }) => {
      console.log('[DEBUG-SR] Updating word:', wordId, 'success:', success);
      setIsUpdating(true);
      hasUpdatedWords.current = true;

      const newInterval = success
        ? Math.max(1, Math.round(wordToUpdate.interval_days * wordToUpdate.ease_factor))
        : 1;
      const newEaseFactor = success
        ? Math.max(1.3, wordToUpdate.ease_factor + 0.1)
        : Math.max(1.3, wordToUpdate.ease_factor - 0.2);

      // IMPORTANT FIX: Cap the interval to prevent date overflow errors
      // PostgreSQL can only handle dates up to 5874897 AD
      const cappedInterval = Math.min(newInterval, 365 * 30); // Cap at 30 years

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + cappedInterval);

      // Validate the date is within reasonable bounds
      const now = new Date();
      const maxDate = new Date(now);
      maxDate.setFullYear(now.getFullYear() + 30); // Max 30 years in the future

      const finalNextReview = nextReview > maxDate ? maxDate : nextReview;

      console.log(
        '[DEBUG-SR] Calculated next review date:',
        finalNextReview.toISOString(),
        'with interval:',
        cappedInterval,
        'days (original interval:',
        newInterval,
        'days)'
      );

      // Prepare update payload
      const updatedWord = {
        interval_days: cappedInterval, // Use capped interval
        ease_factor: newEaseFactor,
        next_review_at: finalNextReview.toISOString(),
        review_count: wordToUpdate.review_count + 1,
        lapses: success ? wordToUpdate.lapses : wordToUpdate.lapses + 1,
      };
      console.log('[DEBUG-SR] Updated word data:', updatedWord);

      // Apply optimistic update to cache
      queryClient.setQueryData(['dueWords', userId], (oldData: StudyWord[] | undefined) => {
        if (!oldData) return oldData;
        // Create a new array with the updated word
        return oldData.map(word =>
          String(word.sentence_word_id) === String(wordId) ? { ...word, ...updatedWord } : word
        );
      });
      console.log('[DEBUG-SR] Applied optimistic update to cache');

      try {
        // Convert wordId to number as required by the service
        await studyWordsService.updateWordReview(Number(wordId), updatedWord);
        console.log('[DEBUG-SR] Successfully updated word in database');
        return { wordId, success, updatedWord };
      } catch (error: unknown) {
        console.error('[DEBUG-SR] Error updating word review:', error);

        // Add more detailed error logging
        if (error instanceof Error) {
          console.error('[DEBUG-SR] Error details:', {
            message: error.message,
            stack: error.stack,
            wordId,
            updatedWord,
          });
        }

        // Try a fallback approach with a more conservative date if this was a date-related error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage &&
          (errorMessage.includes('time zone') ||
            errorMessage.includes('date') ||
            errorMessage.includes('timestamp'))
        ) {
          console.log('[DEBUG-SR] Attempting fallback with conservative date');
          try {
            // Use a very conservative approach - just 1 year in the future
            const safeDate = new Date();
            safeDate.setFullYear(safeDate.getFullYear() + 1);

            const safeUpdatedWord = {
              ...updatedWord,
              interval_days: Math.min(updatedWord.interval_days, 365),
              next_review_at: safeDate.toISOString(),
            };

            console.log('[DEBUG-SR] Fallback update with safe date:', safeUpdatedWord);
            await studyWordsService.updateWordReview(Number(wordId), safeUpdatedWord);
            console.log('[DEBUG-SR] Fallback update successful');
            return { wordId, success, updatedWord: safeUpdatedWord };
          } catch (fallbackError) {
            console.error('[DEBUG-SR] Fallback update also failed:', fallbackError);
          }
        }

        // Invalidate cache on error to ensure it's up to date
        invalidateQueries();
        throw error;
      }
    },
    onSuccess: () => {
      if (mountedRef.current) {
        // Always use function form to ensure latest value
        const newIndex = Math.min(currentIndex + 1, dueWords.length);
        console.log('[DEBUG-SR] Updating currentIndex from', currentIndex, 'to', newIndex);
        setCurrentIndex(prev => Math.min(prev + 1, dueWords.length));
      }
    },
    onError: () => {
      // Continue to next word even if there's an error
      if (mountedRef.current) {
        console.log('[DEBUG-SR] Error occurred, still advancing to next word');
        setCurrentIndex(prev => Math.min(prev + 1, dueWords.length));
      }
    },
    onSettled: () => {
      if (mountedRef.current) {
        console.log('[DEBUG-SR] Setting isUpdating to false');
        setIsUpdating(false);
      }
    },
  });

  const determineTransitionType = useCallback((success: boolean) => {
    const type = success ? 'fade' : 'slide';
    console.log('[DEBUG-SR] Determined transition type:', type, 'for success:', success);
    return type;
  }, []);

  // Update word function
  const updateWord = useCallback(
    async (wordId: string, success: boolean) => {
      console.log('[DEBUG-SR] updateWord called with wordId:', wordId, 'success:', success);

      // Prevent updates if component is unmounted
      if (!mountedRef.current) {
        console.log('[DEBUG-SR] Component unmounted, skipping update');
        return;
      }

      // Guard against updating past the end of the array
      if (currentIndex >= wordsRef.current.length) {
        console.log('[DEBUG-SR] currentIndex out of bounds, skipping update');
        return;
      }

      const wordToUpdate = wordsRef.current[currentIndex];
      if (!wordToUpdate?.sentence_word_id) {
        console.log('[DEBUG-SR] No word to update, skipping');
        return;
      }

      // Ensure we're comparing the correct IDs (both as strings)
      if (String(wordToUpdate.sentence_word_id) !== String(wordId)) {
        console.error('[DEBUG-SR] Word ID mismatch in updateWord', {
          expected: wordToUpdate.sentence_word_id,
          received: wordId,
        });
        return;
      }

      // Set transition type immediately before the animation starts
      // This is the ONLY place we should set the transition type
      console.log('[DEBUG-SR] Setting transition type before animation');
      setTransitionType(determineTransitionType(success));

      console.log('[DEBUG-SR] Calling updateWordMutation.mutate');
      await updateWordMutation.mutate({
        wordId,
        success,
        wordToUpdate,
      });
    },
    [currentIndex, updateWordMutation, determineTransitionType]
  );

  // Check if review is completed and invalidate relevant queries
  useEffect(() => {
    if (isComplete) {
      invalidateQueries();
      if (onComplete) {
        onComplete();
      }
    }
  }, [isComplete, onComplete, invalidateQueries]);

  // Invalidate queries on unmount if session was started but not completed
  useEffect(() => {
    return () => {
      if (hasUpdatedWords.current) {
        // Always invalidate queries on unmount if we've updated words
        // We don't need to check mountedRef here as this is a cleanup function
        invalidateQueries();
      }
    };
  }, [invalidateQueries]);

  return {
    dueWords,
    currentIndex,
    currentWord,
    isLoading,
    isUpdating,
    updateWord,
    progress,
    isComplete,
    invalidateQueries,
    transitionType, // Make sure we export transitionType
  };
}
