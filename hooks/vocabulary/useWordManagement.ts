import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { wordManagementService } from '@/services/wordManagement';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';

interface UseWordManagementOptions {
  onWordRemoved?: (word: StudyWord) => void;
  onWordUpdated?: (word: StudyWord) => void;
}

interface UseWordManagementReturn {
  isModalVisible: boolean;
  selectedWord: StudyWord | null;
  showWordManagement: (word: StudyWord) => void;
  hideWordManagement: () => void;
  handleRemoveFromStudy: (word: StudyWord) => Promise<void>;
  handleResetProgress: (word: StudyWord) => Promise<void>;
  handleSkipForToday: (word: StudyWord) => Promise<void>;
  handleMarkAsEasy: (word: StudyWord) => Promise<void>;
  handleMarkAsHard: (word: StudyWord) => Promise<void>;
  isProcessing: boolean;
}

export function useWordManagement(options: UseWordManagementOptions = {}): UseWordManagementReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { onWordRemoved, onWordUpdated } = options;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<StudyWord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showWordManagement = useCallback((word: StudyWord) => {
    selectionFeedback();
    setSelectedWord(word);
    setIsModalVisible(true);
  }, []);

  const hideWordManagement = useCallback(() => {
    setIsModalVisible(false);
    setSelectedWord(null);
  }, []);

  const invalidateQueries = useCallback(() => {
    if (!user?.id) return;

    // Invalidate specific FSRS queries
    queryClient.invalidateQueries({
      queryKey: FSRS_QUERY_KEYS.all(user.id),
    });
    queryClient.invalidateQueries({
      queryKey: FSRS_QUERY_KEYS.due(user.id),
    });
    queryClient.invalidateQueries({
      queryKey: FSRS_QUERY_KEYS.stats(user.id),
    });

    // Invalidate vocabulary stats used by Practice screen
    queryClient.invalidateQueries({
      queryKey: ['vocabulary-stats', user.id],
    });

    // Invalidate broader patterns for any remaining queries
    queryClient.invalidateQueries({
      queryKey: ['fsrs-words'],
    });
  }, [user?.id, queryClient]);

  const handleRemoveFromStudy = useCallback(
    async (word: StudyWord) => {
      if (!user?.id) return;

      setIsProcessing(true);
      try {
        await wordManagementService.removeFromStudy(user.id, word.root_id);
        invalidateQueries();
        onWordRemoved?.(word);
      } catch (error) {
        handleError(
          error instanceof Error
            ? error
            : new Error(STRINGS.FAILED_TO_REMOVE_WORD_FROM_STUDY),
          {
            analyticsEventName: 'Word_Management_Remove_Error',
            showToast: true,
          }
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, invalidateQueries, onWordRemoved]
  );

  const handleResetProgress = useCallback(
    async (word: StudyWord) => {
      if (!user?.id) return;

      setIsProcessing(true);
      try {
        await wordManagementService.resetProgress(user.id, word.root_id);
        invalidateQueries();
        onWordUpdated?.(word);
      } catch (error) {
        handleError(
          error instanceof Error
            ? error
            : new Error(STRINGS.FAILED_TO_RESET_WORD_PROGRESS),
          {
            analyticsEventName: 'Word_Management_Reset_Error',
            showToast: true,
          }
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, invalidateQueries, onWordUpdated]
  );

  const handleSkipForToday = useCallback(
    async (word: StudyWord) => {
      if (!user?.id) return;

      setIsProcessing(true);
      try {
        await wordManagementService.skipForToday(user.id, word.root_id);
        invalidateQueries();
        onWordUpdated?.(word);
      } catch (error) {
        handleError(
          error instanceof Error
            ? error
            : new Error(STRINGS.FAILED_TO_SKIP_WORD_FOR_TODAY),
          {
            analyticsEventName: 'Word_Management_Skip_Error',
            showToast: true,
          }
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, invalidateQueries, onWordUpdated]
  );

  const handleMarkAsEasy = useCallback(
    async (word: StudyWord) => {
      if (!user?.id) return;

      setIsProcessing(true);
      try {
        await wordManagementService.markAsEasy(user.id, word);
        invalidateQueries();
        onWordUpdated?.(word);
      } catch (error) {
        handleError(
          error instanceof Error
            ? error
            : new Error(STRINGS.FAILED_TO_MARK_WORD_AS_EASY),
          {
            analyticsEventName: 'Word_Management_Easy_Error',
            showToast: true,
          }
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, invalidateQueries, onWordUpdated]
  );

  const handleMarkAsHard = useCallback(
    async (word: StudyWord) => {
      if (!user?.id) return;

      setIsProcessing(true);
      try {
        await wordManagementService.markAsHard(user.id, word);
        invalidateQueries();
        onWordUpdated?.(word);
      } catch (error) {
        handleError(
          error instanceof Error
            ? error
            : new Error(STRINGS.FAILED_TO_MARK_WORD_AS_HARD),
          {
            analyticsEventName: 'Word_Management_Hard_Error',
            showToast: true,
          }
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, invalidateQueries, onWordUpdated]
  );

  return {
    isModalVisible,
    selectedWord,
    showWordManagement,
    hideWordManagement,
    handleRemoveFromStudy,
    handleResetProgress,
    handleSkipForToday,
    handleMarkAsEasy,
    handleMarkAsHard,
    isProcessing,
  };
}
