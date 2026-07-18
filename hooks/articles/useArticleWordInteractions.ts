import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { fsrsQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useModalState } from '@/hooks/ui/useModalState';
import { analytics } from '@/services/analytics';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { mediumFeedback, selectionFeedback } from '@/utils/haptics';

export interface UseArticleWordInteractionsOptions {
  /** Handler for toggling word study status */
  handleRootPress: (rootId: RootId) => Promise<boolean | undefined>;
  /** Callback to refetch study words after mutations */
  refetchStudyWords?: () => Promise<unknown>;
  /**
   * When true, a word tap shows the lightweight inline tooltip first and the
   * full word card opens on a second tap (the tooltip's "see more"). When false
   * (default), a word tap opens the word card directly — more discoverable, so
   * users don't have to find the tooltip's follow-up tap.
   */
  showTooltipFirst?: boolean;
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
  showTooltipFirst = false,
}: UseArticleWordInteractionsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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

  // Mirror the preference into a ref so handleWordPress stays a stable callback
  // even when the setting is toggled mid-session.
  const showTooltipFirstRef = useRef(showTooltipFirst);
  useEffect(() => {
    showTooltipFirstRef.current = showTooltipFirst;
  }, [showTooltipFirst]);

  /**
   * Handle word press.
   * Default: open the word details card directly (discoverable, one tap).
   * When `showTooltipFirst` is enabled: show/hide the inline tooltip instead,
   * and the card opens from the tooltip's follow-up tap (handleOpenWordDetails).
   * Uses refs for stable callback identity to prevent re-renders.
   */
  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      if (!showTooltipFirstRef.current) {
        wordDetailsModal.open(word);
        return;
      }

      if (layout && layout.width > 0) {
        if (activeTooltipRef.current?.word.id === word.id) {
          setActiveTooltip(null);
        } else {
          setActiveTooltip({ word, layout });
        }
      }
    },
    [wordDetailsModal.open], // open is a stable callback; refs cover the rest
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
   * Whether a root is currently in the study list.
   * Checks local optimistic state first, then falls back to query cache.
   */
  const isRootInStudyList = (rootId: RootId): boolean => {
    const localState = localStudyStates.get(rootId);
    if (localState !== undefined) return localState;

    if (!user?.id) return false;
    const allWords = queryClient.getQueryData<StudyWord[]>(fsrsQueries.all(user.id).queryKey) ?? [];
    return allWords.some(word => word.root_id === rootId);
  };

  // Ref mirror (synced every commit) so handleWordLongPress keeps a stable
  // identity across optimistic study-state updates (avoids re-rendering
  // every sentence)
  const isRootInStudyListRef = useRef(isRootInStudyList);
  useEffect(() => {
    isRootInStudyListRef.current = isRootInStudyList;
  });

  /**
   * Long-press on a word: instant save to practice (toggle — long-press again
   * to undo). Words without a root fall back to the regular tap behavior.
   * All guards (auth redirect, daily limit, capacity) are inherited from
   * handleAddWordToStudy / handleRootPress.
   */
  const handleWordLongPress = useCallback(
    async (word: SentenceWord, layout?: LayoutRectangle) => {
      if (!word.root_id) {
        handleWordPress(word, layout);
        return;
      }

      // Don't leave a tooltip hovering over the word being toggled
      if (activeTooltipRef.current) {
        setActiveTooltip(null);
      }

      mediumFeedback();
      const wasInStudy = isRootInStudyListRef.current(word.root_id);
      const succeeded = await handleAddWordToStudy(word);
      // Guard failures (daily limit, auth) already showed their own feedback
      if (!succeeded) return;

      analytics.track(ANALYTICS_EVENTS.WORD_LONG_PRESS_SAVE, {
        root_id: word.root_id,
        action: wasInStudy ? 'remove' : 'add',
      });
      showToast(
        wasInStudy ? STRINGS.WORD_QUICK_REMOVED : STRINGS.WORD_QUICK_SAVED,
        3000,
        wasInStudy ? ToastType.INFO : ToastType.SUCCESS,
      );
    },
    [handleWordPress, handleAddWordToStudy, showToast],
  );

  /**
   * Compute whether current word details modal word is in study list
   */
  const isInStudyList = wordDetailsModal.data?.root_id
    ? isRootInStudyList(wordDetailsModal.data.root_id)
    : false;

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
    // Handlers
    handleWordPress,
    handleWordLongPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    closeTooltipOnScroll,
  };
}
