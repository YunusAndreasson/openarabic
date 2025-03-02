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
    queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    queryClient.invalidateQueries({ queryKey: ['studyWords'] });
    queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    queryClient.invalidateQueries({ queryKey: ['dueWords'] });
  }, [queryClient]);

  // Fetch due words
  const { data: dueWords = [], isLoading } = useQuery({
    queryKey: ['dueWords', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const words = await studyWordsService.getStudyWords(userId);

      // Pre-compute current timestamp once for comparison
      const now = Date.now();

      // Filter due words more efficiently - only check if review date is due
      // Remove the interval_days < 30 condition to match vocabulary screen's definition
      const filteredWords = words.filter(word => {
        if (!word.sentence_word || !word.next_review_at) return false;

        // Avoid creating multiple Date objects in the loop
        const reviewDate = new Date(word.next_review_at).getTime();
        return reviewDate <= now;
      });

      // Sort by next review date (oldest first)
      if (filteredWords.length > 1) {
        filteredWords.sort((a, b) => {
          // Use cached timestamp values to avoid redundant Date object creation
          const dateA = new Date(a.next_review_at).getTime();
          const dateB = new Date(b.next_review_at).getTime();
          return dateA - dateB;
        });
      }

      return filteredWords;
    },
    enabled: !!userId,
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

      // No need to set transition type here, it's already set in updateWord function
      // Remove duplicate: setTransitionType(success ? 'fade' : 'slide');

      const newInterval = success
        ? Math.max(1, Math.round(wordToUpdate.interval_days * wordToUpdate.ease_factor))
        : 1;
      const newEaseFactor = success
        ? Math.max(1.3, wordToUpdate.ease_factor + 0.1)
        : Math.max(1.3, wordToUpdate.ease_factor - 0.2);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + newInterval);

      try {
        await studyWordsService.updateWordReview(Number(wordId), {
          interval_days: newInterval,
          ease_factor: newEaseFactor,
          next_review_at: nextReview.toISOString(),
          review_count: wordToUpdate.review_count + 1,
          lapses: success ? wordToUpdate.lapses : wordToUpdate.lapses + 1,
        });
      } catch (error) {
        console.error('Error updating word review:', error);
        // Continue to next word even if there's an error
        if (mountedRef.current) {
          setCurrentIndex(prev => Math.min(prev + 1, dueWords.length));
        }
      }
    },
    onSuccess: () => {
      if (mountedRef.current) {
        // Always use function form to ensure latest value
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
