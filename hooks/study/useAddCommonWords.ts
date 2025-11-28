import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

interface UseAddCommonWordsOptions {
  onSuccess?: () => void;
}

interface UseAddCommonWordsResult {
  addWords: (rootIds: number[]) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Hook to add selected words to the user's practice list.
 * Used in the empty state to help users start practicing immediately.
 */
export function useAddCommonWords(options?: UseAddCommonWordsOptions): UseAddCommonWordsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async (rootIds: number[]) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (rootIds.length === 0) {
        throw new Error('No words selected');
      }

      // Add selected roots to study list
      const addedCount = await studyWordsFSRSService.addMultipleRoots(user.id, rootIds);

      return { addedCount };
    },
    onSuccess: async ({ addedCount }) => {
      if (!user?.id) return;

      // Track analytics
      analytics.track(ANALYTICS_EVENTS.COMMON_WORDS_ADDED, {
        count: addedCount,
      });

      // Invalidate FSRS queries to refresh the practice list
      await fsrsQueries.invalidateCommon(queryClient, user.id, DEFAULT_SESSION_COOLDOWN_HOURS);

      // Show encouraging toast with haptic
      successFeedback();
      showToast(STRINGS.WORDS_ADDED_SUCCESS, undefined, ToastType.SUCCESS);

      // Call onSuccess callback
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      handleError(error);
      showToast(STRINGS.FAILED_TO_ADD_COMMON_WORDS, undefined, ToastType.ERROR);
    },
  });

  return {
    addWords: mutation.mutate,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
