import { useState, useRef, useCallback, useEffect } from 'react';
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to invalidate queries
  const invalidateQueries = useCallback(() => {
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
      if (!userId) throw new Error('User ID is required');
      // Use the onlyDue option to filter on the server side
      const words = await studyWordsService.getStudyWords(userId, { onlyDue: true });

      // Server already filtered for due words, so we just need to sort
      if (words.length > 1) {
        words.sort((a, b) => {
          // Use cached timestamp values to avoid redundant Date object creation
          const dateA = new Date(a.next_review_at).getTime();
          const dateB = new Date(b.next_review_at).getTime();
          return dateA - dateB;
        });
      }

      return words;
    },
    enabled: !!userId,
    // Improve caching strategy
    staleTime: 60 * 1000, // 1 minute before considering stale
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (React Query v5 uses gcTime instead of cacheTime)
  });

  useEffect(() => {
    if (dueWords && Array.isArray(dueWords)) {
      wordsRef.current = [...dueWords] as StudyWord[];
    }
  }, [dueWords]);

  // Calculate if review is complete
  const isComplete = currentIndex >= dueWords.length && dueWords.length > 0;

  // Calculate progress percentage
  const progress = dueWords.length > 0 ? (currentIndex / dueWords.length) * 100 : 0;

  // Get current word with safety check to prevent "error loading word"
  const currentWord = currentIndex < dueWords.length ? dueWords[currentIndex] : undefined;

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
      setIsUpdating(true);
      hasUpdatedWords.current = true;

      const newInterval = success
        ? Math.max(1, Math.round(wordToUpdate.interval_days * wordToUpdate.ease_factor))
        : 1;
      const newEaseFactor = success
        ? Math.max(1.3, wordToUpdate.ease_factor + 0.1)
        : Math.max(1.3, wordToUpdate.ease_factor - 0.2);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + newInterval);

      // Prepare update payload
      const updatedWord = {
        interval_days: newInterval,
        ease_factor: newEaseFactor,
        next_review_at: nextReview.toISOString(),
        review_count: wordToUpdate.review_count + 1,
        lapses: success ? wordToUpdate.lapses : wordToUpdate.lapses + 1,
      };

      // Apply optimistic update to cache
      queryClient.setQueryData(['dueWords', userId], (oldData: StudyWord[] | undefined) => {
        if (!oldData) return oldData;
        // Create a new array with the updated word
        return oldData.map(word =>
          String(word.sentence_word_id) === String(wordId) ? { ...word, ...updatedWord } : word
        );
      });

      try {
        await studyWordsService.updateWordReview(Number(wordId), updatedWord);
        return { wordId, success, updatedWord };
      } catch (error) {
        console.error('Error updating word review:', error);
        // Invalidate cache on error to ensure it's up to date
        invalidateQueries();
        throw error;
      }
    },
    onSuccess: () => {
      if (mountedRef.current) {
        // Always use function form to ensure latest value
        setCurrentIndex(prev => Math.min(prev + 1, dueWords.length));
      }
    },
    onError: () => {
      // Continue to next word even if there's an error
      if (mountedRef.current) {
        setCurrentIndex(prev => Math.min(prev + 1, dueWords.length));
      }
    },
    onSettled: () => {
      if (mountedRef.current) setIsUpdating(false);
    },
  });

  // Update word function
  const updateWord = useCallback(
    async (wordId: string, success: boolean) => {
      // Guard against updating past the end of the array
      if (currentIndex >= wordsRef.current.length) return;

      const wordToUpdate = wordsRef.current[currentIndex];
      if (!wordToUpdate?.sentence_word_id) return;

      // Ensure we're comparing the correct IDs (both as strings or both as numbers)
      if (String(wordToUpdate.sentence_word_id) !== String(wordId)) {
        console.error('Word ID mismatch in updateWord', {
          expected: wordToUpdate.sentence_word_id,
          received: wordId,
        });
        return;
      }

      // Set transition type immediately before the animation starts
      // This is the ONLY place we should set the transition type
      setTransitionType(success ? 'fade' : 'slide');

      await updateWordMutation.mutate({
        wordId,
        success,
        wordToUpdate,
      });
    },
    [currentIndex, updateWordMutation]
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
      if (hasUpdatedWords.current && !isComplete && mountedRef.current) {
        invalidateQueries();
      }
    };
  }, [invalidateQueries, isComplete]);

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
