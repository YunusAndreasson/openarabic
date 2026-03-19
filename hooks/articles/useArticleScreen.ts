import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';

import type { FlashListRef } from '@shopify/flash-list';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useReadingListMutations } from '@/hooks/articles/useReadingListMutations';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useArticleWordInteractions } from '@/hooks/articles/useArticleWordInteractions';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAuth } from '@/hooks/auth/useAuth';
import type { ArticleId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { ToastType } from '@/types/enums';
import { stopAudioSafely } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';

export interface UseArticleScreenOptions {
  id: string;
  showToast: (message: string, duration: number, type: ToastType) => void;
  disableAutoScroll?: boolean;
}

/**
 * Hook containing all business logic for the article screen
 * Extracts state management, handlers, and effects from the screen component
 *
 * @param options - Screen configuration
 * @returns All state, handlers, and props needed for rendering
 */
export function useArticleScreen({
  id,
  showToast,
  disableAutoScroll = false,
}: UseArticleScreenOptions) {
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

  // Track article viewed (once per article load)
  const hasTrackedArticleView = useRef(false);
  useEffect(() => {
    if (article && !hasTrackedArticleView.current) {
      hasTrackedArticleView.current = true;
      analytics.track(ANALYTICS_EVENTS.ARTICLE_VIEWED, {
        article_id: article.id,
        article_title: article.title,
        category: article.category.name,
      });
    }
  }, [article]);

  // Current sentence index for reading progress
  const [currentSentenceIndexForProgress, setCurrentSentenceIndexForProgress] = useState(0);

  // Article mutations - using focused hooks directly
  const { handleToggleReadingList } = useReadingListMutations(refetchReadingListStatus);
  const { handleRootPress } = useStudyWordMutations(async () => {
    await refetchStudyWords();
  });

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

    // Dismiss the modal screen, or navigate to library home if not dismissible
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.push(ROUTE_PATHS.EXPLORE_TAB);
    }
  }, []);

  // Reading progress
  const isActive = Boolean(article) && !isLoadingArticle;
  const { updateProgress, initialLastSentenceRead, hadExistingProgressOnMount } =
    useReadingProgress({
      articleId: articleId ?? (0 as ArticleId),
      totalSentences: sortedSentences?.length ?? 0,
      currentSentenceIndex: currentSentenceIndexForProgress,
      isActive,
    });

  // Track current sentence for reading progress
  const scrollViewRef = useRef<FlashListRef<Tables<'article_sentences'>> | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  // High water mark: the furthest sentence the user has reached (never decreases)
  const highWaterMarkRef = useRef(0);

  // Track scroll state - one attempt per article
  const hasScrolledToPositionRef = useRef(false);
  const [isFlashListReady, setIsFlashListReady] = useState(false);
  // Track current position for UI, but debounce DB updates
  const pendingProgressUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset scroll state when article changes
  useEffect(() => {
    hasScrolledToPositionRef.current = false;
    highWaterMarkRef.current = 0;
    setIsFlashListReady(false);
  }, [articleId]);

  const handleFlashListLoad = useCallback(() => {
    setIsFlashListReady(true);
  }, []);

  // Handle viewable items changed to track current sentence
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;

      const totalSentences = sortedSentences?.length ?? 0;
      if (totalSentences === 0) return;

      // Find the highest visible sentence index from viewable items.
      // FlashList v2 includes the ListHeaderComponent at index 0,
      // so data items start at index 1. We subtract 1 to get the sentence index.
      let maxVisibleSentenceIndex = -1;
      for (const item of viewableItems) {
        if (
          typeof item.index === 'number' &&
          item.index > 0 // Skip ListHeaderComponent (index 0 in FlashList v2)
        ) {
          const sentenceIndex = item.index - 1;
          if (sentenceIndex >= 0 && sentenceIndex < totalSentences) {
            // For the last sentence, count it as viewed even if partially visible
            // (the viewability threshold can prevent it from registering at the bottom)
            const isVisible =
              item.isViewable === true || sentenceIndex === totalSentences - 1;
            if (isVisible) {
              maxVisibleSentenceIndex = Math.max(maxVisibleSentenceIndex, sentenceIndex);
            }
          }
        }
      }

      if (maxVisibleSentenceIndex >= 0) {
        // High water mark: only advance, never go backward
        const newHighWater = Math.max(highWaterMarkRef.current, maxVisibleSentenceIndex);
        if (newHighWater !== highWaterMarkRef.current) {
          highWaterMarkRef.current = newHighWater;
          setCurrentSentenceIndex(newHighWater);
        }
      }
    },
    [sortedSentences?.length],
  );

  // Debounced progress update - only save to DB when user stops scrolling
  useEffect(() => {
    // Clear any pending update
    if (pendingProgressUpdateRef.current) {
      clearTimeout(pendingProgressUpdateRef.current);
    }

    // Don't update if article is still loading
    if (!article || isLoadingArticle) {
      return;
    }

    // Schedule DB update after 1 second of inactivity
    pendingProgressUpdateRef.current = setTimeout(() => {
      if (currentSentenceIndex >= 0) {
        updateProgress(currentSentenceIndex);
      }
    }, 1000);

    return () => {
      if (pendingProgressUpdateRef.current) {
        clearTimeout(pendingProgressUpdateRef.current);
      }
    };
  }, [currentSentenceIndex, article, isLoadingArticle, updateProgress]);

  // Handle scroll end - placeholder for ArticleContent onMomentumScrollEnd prop
  const handleScrollEnd = useCallback(() => {
    // No-op: viewable items callback handles all position tracking
  }, []);


  // Sync sentence index (for any other features that might use it)
  useEffect(() => {
    setCurrentSentenceIndexForProgress(currentSentenceIndex);
  }, [currentSentenceIndex]);

  // Scroll to position effect - triggers when all conditions are met
  useEffect(() => {
    const totalSentences = sortedSentences?.length ?? 0;

    if (
      !hasScrolledToPositionRef.current &&
      isFlashListReady &&
      !isLoadingArticle &&
      article &&
      !disableAutoScroll &&
      hadExistingProgressOnMount &&
      initialLastSentenceRead > 0 &&
      totalSentences > 0
    ) {
      const targetIndex = initialLastSentenceRead + 1;
      const maxIndex = totalSentences;

      if (targetIndex > maxIndex) {
        hasScrolledToPositionRef.current = true;
        return;
      }

      if (!scrollViewRef.current) {
        return;
      }

      hasScrolledToPositionRef.current = true;

      // Initialize high water mark to the saved position so viewability
      // tracking only records progress BEYOND the resume point.
      highWaterMarkRef.current = initialLastSentenceRead;

      // Double RAF ensures FlashList layout is complete (v2 best practice)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // scrollToIndex accounts for actual item heights and header
            // +1 offset because FlashList index 0 = ListHeaderComponent
            scrollViewRef.current?.scrollToIndex({
              index: targetIndex,
              animated: true,
              viewPosition: 0, // Place target at top of viewport
            });
          } catch {
            // Silent error - scroll failed
          }

          // Show toast
          const percentage = Math.round(((initialLastSentenceRead + 1) / totalSentences) * 100);
          const message = STRINGS.RESUMED_READING_TEMPLATE.replace(
            '{percent}',
            percentage.toString(),
          );
          showToast(message, 3000, ToastType.INFO);
        });
      });
    } else if (!hasScrolledToPositionRef.current && isFlashListReady) {
      hasScrolledToPositionRef.current = true;
    }
  }, [
    isFlashListReady,
    isLoadingArticle,
    article,
    sortedSentences,
    disableAutoScroll,
    hadExistingProgressOnMount,
    initialLastSentenceRead,
    showToast,
  ]);

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
