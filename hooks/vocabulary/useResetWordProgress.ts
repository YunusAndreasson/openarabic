import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/providers';
import { fsrsQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
import { createResetFSRSUpdate } from '@/utils/fsrsInitializers';

interface UseResetWordProgressResult {
  /** Confirm with the user (destructive), then reset the word's FSRS progress. */
  confirmReset: (rootId: RootId) => void;
  isResetting: boolean;
}

/**
 * Resets a leech's FSRS progress so it starts over as a brand-new word — the
 * honest move when a word has become hopelessly tangled. Writes the canonical
 * "new card" state via the existing direct UPDATE (no migration, no review log),
 * confirming first since it discards the word's accumulated schedule.
 */
export function useResetWordProgress(): UseResetWordProgressResult {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: async (rootId: RootId) => {
      if (!user?.id) throw new Error(STRINGS.PLEASE_SIGN_IN_TO_ADD_WORDS);
      return studyWordsFSRSService.updateWordAndReview(user.id, rootId, createResetFSRSUpdate());
    },
    onSuccess: () => {
      if (user?.id) {
        void fsrsQueries.invalidateAll(queryClient, user.id);
      }
      showToast(STRINGS.WORD_PROGRESS_RESET, undefined, ToastType.SUCCESS);
    },
    onError: (error: Error) => {
      void handleError(error);
      showToast(STRINGS.FAILED_TO_RESET_WORD_PROGRESS, undefined, ToastType.ERROR);
    },
  });

  const confirmReset = useCallback(
    (rootId: RootId) => {
      Alert.alert(STRINGS.RESET_WORD_PROGRESS, STRINGS.RESET_WORD_PROGRESS_CONFIRM, [
        { text: STRINGS.CANCEL, style: 'cancel' },
        { text: STRINGS.RESET, style: 'destructive', onPress: () => mutate(rootId) },
      ]);
    },
    [mutate],
  );

  return { confirmReset, isResetting: isPending };
}
