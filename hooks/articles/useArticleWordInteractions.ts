import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { fsrsQueries, gated } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useModalState } from '@/hooks/ui/useModalState';
import { analytics } from '@/services/analytics';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type { SentenceWord, StudyWordIntent } from '@/types/vocabulary.types';
import type { StudyWordPressOptions } from '@/hooks/articles/useStudyWordMutations';
import { mediumFeedback } from '@/utils/haptics';

export interface UseArticleWordInteractionsOptions {
  /** Handler for toggling word study status */
  handleRootPress: (
    rootId: RootId,
    intent?: StudyWordIntent,
    options?: StudyWordPressOptions,
  ) => Promise<boolean | undefined>;
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
  const { showToast } = useToast();

  // Live subscription to the shared study-word cache. The toggle mutation's
  // onMutate already writes its optimistic value straight into this cache
  // entry, so reading it reactively gives every consumer (this hook, the
  // dictionary list, the word-detail page) the same answer at the same time —
  // no per-screen local copy that can drift once a word is toggled elsewhere.
  const studyWordsQuery = useQuery({
    ...gated(fsrsQueries.all, user?.id),
  });

  // Tooltip state for word tap preview
  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Word details modal state
  const wordDetailsModal = useModalState<SentenceWord>();

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

  // The article screen wraps the whole reading area in a background-dismiss
  // Tap gesture so tapping away from an open tooltip closes it. A word's own
  // native button normally cancels that Tap, but if a word tap ever completes
  // both, the background close lands last and would stomp the word's own
  // switch-to-this-word update. Set synchronously here and consumed by
  // handleBackgroundPress in the same tick so a word tap can tell the
  // background "already handled, don't also close." The timeout clears the
  // flag when no background press follows — the usual case since Gesture
  // Handler 3 — so it never swallows the next, unrelated tap.
  const wordPressHandledRef = useRef(false);

  /**
   * Handle word press.
   * Default: open the word details card directly (discoverable, one tap).
   * When `showTooltipFirst` is enabled: show/hide the inline tooltip instead,
   * and the card opens from the tooltip's follow-up tap (handleOpenWordDetails).
   * Uses refs for stable callback identity to prevent re-renders.
   */
  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      wordPressHandledRef.current = true;
      setTimeout(() => {
        wordPressHandledRef.current = false;
      }, 0);

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
   * Background tap (anywhere in the reading area that isn't a word or the
   * tooltip bubble itself): close the active tooltip — unless a word press
   * just handled this same tap, in which case that word already set the
   * tooltip it wants shown.
   */
  const handleBackgroundPress = useCallback(() => {
    if (wordPressHandledRef.current) {
      wordPressHandledRef.current = false;
      return;
    }
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
    async (
      word: SentenceWord,
      intent?: StudyWordIntent,
      options?: StudyWordPressOptions,
    ): Promise<boolean> => {
      if (!user?.id || !word.root_id) return false;

      // No haptic here: every caller has already fired its own for the press
      // that got us here (the word sheet a selection tick, long-press a medium
      // one). Firing a second one made a single save buzz twice.
      const result = await handleRootPress(word.root_id, intent, options);
      if (result === undefined) return false;

      // No local state to update: the mutation's onMutate already wrote the
      // optimistic value into the fsrsQueries.all cache, and isRootInStudyList
      // below reads that cache reactively.
      await refetchStudyWords?.();

      return true;
    },
    [user?.id, handleRootPress, refetchStudyWords],
  );

  /**
   * Whether a root is currently in the study list. Reads the shared
   * fsrsQueries.all cache reactively — the same source every screen mutates
   * through, so a toggle from the dictionary list or the word-detail page is
   * reflected here without waiting for this screen to remount.
   */
  const isRootInStudyList = (rootId: RootId): boolean => {
    return studyWordsQuery.data?.some(word => word.root_id === rootId) ?? false;
  };

  // Ref mirror (synced every commit) so handleWordLongPress keeps a stable
  // identity across optimistic study-state updates (avoids re-rendering
  // every sentence)
  const isRootInStudyListRef = useRef(isRootInStudyList);
  useEffect(() => {
    isRootInStudyListRef.current = isRootInStudyList;
  });

  // The query mutation/refetch callbacks can receive new identities when the
  // study cache updates. Long-press is handed to every mounted word, so keep
  // that public callback stable and read the latest mutation through a ref.
  const handleAddWordToStudyRef = useRef(handleAddWordToStudy);
  useEffect(() => {
    handleAddWordToStudyRef.current = handleAddWordToStudy;
  });

  /**
   * Long-press on a word: instant save to practice (toggle — long-press again
   * to undo). Words without a root fall back to the regular tap behavior.
   * All guards (auth redirect, daily limit, due backlog) are inherited from
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
      // Explicit intent: the toast below promises this exact direction
      const succeeded = await handleAddWordToStudyRef.current(word, wasInStudy ? 'remove' : 'add');
      // Guard failures (daily limit, auth) already showed their own feedback
      if (!succeeded) return;

      void analytics.track(ANALYTICS_EVENTS.WORD_LONG_PRESS_SAVE, {
        root_id: word.root_id,
        action: wasInStudy ? 'remove' : 'add',
      });
      showToast(
        wasInStudy ? STRINGS.WORD_QUICK_REMOVED : STRINGS.WORD_QUICK_SAVED,
        3000,
        wasInStudy ? ToastType.INFO : ToastType.SUCCESS,
      );
    },
    [handleWordPress, showToast],
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
    handleBackgroundPress,
    handleOpenWordDetails,
    handleAddWordToStudy,
    closeTooltipOnScroll,
  };
}
