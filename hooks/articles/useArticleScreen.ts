import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { AppState, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useArticleScrollTracking } from '@/hooks/articles/useArticleScrollTracking';
import { useArticleWordInteractions } from '@/hooks/articles/useArticleWordInteractions';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAuth } from '@/hooks/auth/useAuth';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { stopAudioSafely } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';

export interface UseArticleScreenOptions {
  id: string;
  showToast: (message: string, duration: number, type: ToastType) => void;
}

/**
 * Hook containing all business logic for the article screen
 * Extracts state management, handlers, and effects from the screen component
 *
 * @param options - Screen configuration
 * @returns All state, handlers, and props needed for rendering
 */
export function useArticleScreen({ id, showToast }: UseArticleScreenOptions) {
  const { user } = useAuth();

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id ?? '', 10);
    return isNaN(parsed) ? undefined : (parsed as ArticleId);
  }, [id]);

  // Article data
  const {
    article,
    isLoadingArticle,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isInReadingList,
    refetchReadingListStatus,
  } = useArticleData(articleId, user?.id);

  // Article mutations
  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    async () => {
      await refetchStudyWords();
    },
  );

  // Word interactions (tooltips, modal, study state)
  const {
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    handleWordPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    closeTooltipOnScroll,
  } = useArticleWordInteractions({
    handleRootPress,
    refetchStudyWords,
  });

  // Reading progress
  const isActive = Boolean(article) && !isLoadingArticle;
  const { updateProgress, initialLastSentenceRead, hadExistingProgressOnMount } =
    useReadingProgress({
      articleId: articleId ?? 0,
      totalSentences: sortedSentences?.length ?? 0,
      currentSentenceIndex: 0, // Will be updated by scroll tracking
      isActive,
    });

  // Scroll tracking and progress updates
  const {
    scrollViewRef,
    currentSentenceIndex,
    handleViewableItemsChanged,
    handleScrollEnd,
    handleFlashListLoad,
  } = useArticleScrollTracking({
    initialLastSentenceRead,
    hadExistingProgressOnMount,
    sortedSentences,
    article: article ?? null,
    isLoadingArticle,
    updateProgress,
    showToast,
  });

  // Handle scroll to close tooltip
  const handleScroll = useCallback(
    (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Close tooltip when scrolling starts
      closeTooltipOnScroll();
    },
    [closeTooltipOnScroll],
  );

  // Handlers with feedback
  const handleToggleReadingListWithFeedback = useCallback(async () => {
    if (!articleId) return;
    selectionFeedback();
    await handleToggleReadingList(articleId, isInReadingList);
    showToast(
      isInReadingList ? STRINGS.REMOVED_FROM_BOOKMARKS : STRINGS.ADDED_TO_BOOKMARKS,
      3000,
      ToastType.INFO,
    );
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleClose = useCallback(async () => {
    try {
      await stopAudioSafely(true);
    } catch (error) {
      handleError(error as Error, { toastMessage: STRINGS.FAILED_TO_STOP_AUDIO_ON_CLOSE });
    }

    // Check if we can go back, otherwise navigate to library home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(ROUTE_PATHS.EXPLORE_TAB);
    }
  }, []);

  // Refetch on app state change
  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        void refetchStudyWords?.();
      }
    });
    return () => subscription.remove();
  }, [user?.id, refetchStudyWords]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudioSafely();
    };
  }, []);

  return {
    isLoadingArticle,
    article,
    sortedSentences,
    sentenceWordsMap,
    isInReadingList,
    currentSentenceIndex,
    scrollViewRef,
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    handleScrollEnd,
    // Handlers
    handleScroll,
    handleViewableItemsChanged,
    handleToggleReadingListWithFeedback,
    handleClose,
    handleWordPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    handleFlashListLoad,
  };
}
