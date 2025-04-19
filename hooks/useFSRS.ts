import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Card } from 'ts-fsrs';
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

import { studyWordsService } from '@/services/studyWords';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { UseFSRSOptions, UseFSRSResult, FSRSStateTracking } from '@/types/fsrs.types';
import type { StudyWord } from '@/types/vocabulary.types';

export function useFSRS({ userId, onComplete }: UseFSRSOptions): UseFSRSResult {
  const [wordQueue, setWordQueue] = useState<StudyWord[]>([]);
  const [currentWord, setCurrentWord] = useState<StudyWord | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  const totalWordsRef = useRef<number>(0);
  const processedWordsRef = useRef<number>(0);
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
      processedWordsRef.current = 0;
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
          const newQueue = prevQueue.filter((_, index) => index !== 0);
          processedWordsRef.current += 1;

          const newProgress = Math.min(
            Math.round((processedWordsRef.current / totalWordsRef.current) * 100),
            100
          );
          setProgress(newProgress);

          if (newQueue.length === 0) {
            if (!stateTrackingRef.current.completionTriggered) {
              stateTrackingRef.current.completionTriggered = true;
              setTimeout(() => {
                setIsComplete(true);
                onComplete?.();
              }, 0);
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
    [userId, currentWord, isComplete, convertToFSRSCard, fsrsInstance, onComplete]
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
