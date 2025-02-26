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
  const wordsRef = useRef<StudyWord[]>([]);
  const mountedRef = useRef(true);
  const queryClient = useQueryClient();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch due words
  const { data: dueWords = [], isLoading } = useQuery({
    queryKey: ['dueWords', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const words = await studyWordsService.getStudyWords(userId);
      const now = new Date();

      // Directly convert dates to numbers for comparison
      const filteredWords = words.filter(
        word =>
          word.sentence_word &&
          word.next_review_at &&
          new Date(word.next_review_at).getTime() <= now.getTime() &&
          word.interval_days < 30
      );

      // Sort by next review date
      return filteredWords.sort((a, b) => {
        const dateA = new Date(a.next_review_at).getTime();
        const dateB = new Date(b.next_review_at).getTime();
        return dateA - dateB;
      });
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

  // Get current word
  const currentWord = dueWords[currentIndex];

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
          setCurrentIndex(prev => prev + 1);
        }
      }
    },
    onSuccess: () => {
      if (mountedRef.current) {
        setCurrentIndex(prev => prev + 1);
      }
    },
    onSettled: () => {
      if (mountedRef.current) setIsUpdating(false);
    },
  });

  // Update word function
  const updateWord = useCallback(
    async (wordId: string, success: boolean) => {
      const wordToUpdate = wordsRef.current[currentIndex];
      if (!wordToUpdate?.sentence_word_id) return;

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
  }, [isComplete, onComplete]);

  // Function to invalidate queries
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    queryClient.invalidateQueries({ queryKey: ['studyWords'] });
    queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    queryClient.invalidateQueries({ queryKey: ['dueWords'] });
  }, [queryClient]);

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
  };
}
