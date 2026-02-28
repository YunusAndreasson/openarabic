import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';

import { fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { useModalState } from '@/hooks/ui/useModalState';
import { useAppSelectorShallow } from '@/store/hooks';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

export interface UseArticleWordInteractionsOptions {
  /** Handler for toggling word study status */
  handleRootPress: (rootId: RootId) => Promise<boolean | undefined>;
  /** Callback to refetch study words after mutations */
  refetchStudyWords?: () => Promise<unknown>;
}

/**
 * Hook managing word interactions in article view
 * Handles tooltips, word details modal, and study state management
 *
 * Extracted from useArticleScreen to reduce complexity and improve testability
 */
export function useArticleWordInteractions({
  handleRootPress,
  refetchStudyWords,
}: UseArticleWordInteractionsOptions) {
  const { user } = useAuth();
  const wordDetailsEnabled = useAppSelectorShallow(state => state.settings.wordDetailsEnabled);
  const queryClient = useQueryClient();

  // Tooltip state for word tap preview
  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Word details modal state
  const wordDetailsModal = useModalState<SentenceWord>();

  // Local study states for immediate UI updates (optimistic updates)
  const [localStudyStates, setLocalStudyStates] = useState<Map<RootId, boolean>>(new Map());

  // Ref to avoid handleWordPress identity changes when tooltip toggles
  const activeTooltipRef = useRef<typeof activeTooltip>(null);

  // Sync ref with state
  useEffect(() => {
    activeTooltipRef.current = activeTooltip;
  }, [activeTooltip]);

  /**
   * Handle word press to show/hide tooltip
   * Uses ref for stable callback identity to prevent re-renders
   */
  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      if (layout && layout.width > 0) {
        if (activeTooltipRef.current?.word.id === word.id) {
          setActiveTooltip(null);
        } else {
          setActiveTooltip({ word, layout });
        }
      }
    },
    [], // No dependencies - uses ref for stable callback identity
  );

  /**
   * Close active tooltip
   */
  const handleCloseTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  /**
   * Open word details modal from tooltip
   * Closes tooltip and transfers word data to modal
   */
  const handleOpenWordDetails = useCallback(() => {
    const tooltip = activeTooltipRef.current;
    if (tooltip?.word) {
      setActiveTooltip(null);
      wordDetailsModal.open(tooltip.word);
    }
  }, [wordDetailsModal.open]);

  /**
   * Add/remove word from study list
   * Updates local state optimistically and invalidates queries
   * @returns true if operation succeeded, false if it failed (e.g., daily limit reached)
   */
  const handleAddWordToStudy = useCallback(
    async (word: SentenceWord): Promise<boolean> => {
      if (!user?.id || !word.root_id) return false;

      selectionFeedback();

      const result = await handleRootPress(word.root_id);
      if (result === undefined) return false;

      const isNowInStudy = result;

      // Optimistic update for immediate UI feedback
      setLocalStudyStates(prev => {
        const next = new Map(prev);
        next.set(word.root_id, isNowInStudy);
        return next;
      });

      // Note: handleRootPress mutation already invalidates all FSRS queries via invalidateAll
      // We only need to refetch to update local component state
      await refetchStudyWords?.();

      return true;
    },
    [user?.id, handleRootPress, refetchStudyWords],
  );

  /**
   * Compute whether current word details modal word is in study list
   * Checks local optimistic state first, then falls back to query cache
   */
  const isInStudyList = useMemo(() => {
    if (!wordDetailsModal.data?.root_id) return false;

    // Check local optimistic state first
    const localState = localStudyStates.get(wordDetailsModal.data.root_id);
    if (localState !== undefined) return localState;

    // Fall back to query cache
    if (!user?.id) return false;
    const allWords = queryClient.getQueryData<StudyWord[]>(fsrsQueries.all(user.id).queryKey) ?? [];
    return allWords.some(word => word.root_id === wordDetailsModal.data?.root_id);
  }, [wordDetailsModal.data?.root_id, localStudyStates, user?.id, queryClient]);

  /**
   * Close active tooltip when scroll starts
   * Should be called from scroll handler
   */
  const closeTooltipOnScroll = useCallback(() => {
    if (activeTooltipRef.current) {
      setActiveTooltip(null);
    }
  }, []);

  return {
    // State
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    wordDetailsEnabled,

    // Handlers
    handleWordPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    closeTooltipOnScroll,
  };
}
