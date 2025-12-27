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
    wordDetailsEnabled,
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

    // Check if we can go back, otherwise navigate to library home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(ROUTE_PATHS.EXPLORE_TAB);
    }
  }, []);

  // Reading progress
  const isActive = Boolean(article) && !isLoadingArticle;
  const { updateProgress, initialLastSentenceRead, hadExistingProgressOnMount } =
    useReadingProgress({
      articleId: articleId ?? 0,
      totalSentences: sortedSentences?.length ?? 0,
      currentSentenceIndex: currentSentenceIndexForProgress,
      isActive,
    });

  // Track current sentence for reading progress
  const scrollViewRef = useRef<FlashListRef<Tables<'article_sentences'>> | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  // Track scroll state - one attempt per article
  const hasScrolledToPositionRef = useRef(false);
  const [isFlashListReady, setIsFlashListReady] = useState(false);
  // Prevent progress updates immediately after programmatic scroll
  const ignoreProgressUpdatesRef = useRef(true);
  // Track if user has reached the end - locks completion at 100%
  const hasReachedEndRef = useRef(false);
  // Track current position for UI, but debounce DB updates
  const pendingProgressUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset scroll state when article changes
  useEffect(() => {
    hasScrolledToPositionRef.current = false;
    hasReachedEndRef.current = false;
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

      // COMPLETION LOCK: Stop tracking if user has already completed the article
      // This prevents viewability from overwriting 100% completion
      if (hasReachedEndRef.current) {
        return;
      }

      // Skip progress updates if we just did a programmatic scroll
      if (ignoreProgressUpdatesRef.current) {
        return;
      }

      // Find all visible sentences (excluding header at index 0)
      const visibleSentences = viewableItems
        .filter(
          item =>
            typeof item.index === 'number' &&
            item.index > 0 && // Skip header
            item.isViewable === true,
        )
        .map(item => ({
          index: (item.index as number) - 1, // Convert to sentence index
          item: item,
        }))
        .filter(({ index }) => index >= 0 && index < totalSentences);

      if (visibleSentences.length > 0) {
        // Simple approach: always track first visible sentence for reading position
        // onEndReached handler (with aggressive threshold=10) handles 100% completion
        const firstVisibleSentence = visibleSentences[0];
        const newSentenceIndex = firstVisibleSentence?.index;

        // Update UI immediately for smooth progress tracking
        if (newSentenceIndex !== undefined && newSentenceIndex !== currentSentenceIndex) {
          setCurrentSentenceIndex(newSentenceIndex);
        }
      }
    },
    [currentSentenceIndex, sortedSentences?.length],
  );

  // Debounced progress update - only save to DB when user stops scrolling
  useEffect(() => {
    // Clear any pending update
    if (pendingProgressUpdateRef.current) {
      clearTimeout(pendingProgressUpdateRef.current);
    }

    // Don't update if article is still loading or user just did programmatic scroll
    if (!article || isLoadingArticle || ignoreProgressUpdatesRef.current) {
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

  // Handle reaching the end of the article - immediately set to last sentence for 100% completion
  // This ensures articles always reach 100% when user scrolls to the bottom
  // NOTE: This fires VERY aggressively (threshold=10) to catch end scrolling early
  const handleEndReached = useCallback(() => {
    const totalSentences = sortedSentences?.length ?? 0;
    if (totalSentences === 0) return;

    const lastSentenceIndex = totalSentences - 1;
    if (lastSentenceIndex >= 0) {
      // LOCK COMPLETION: Prevent viewability from overwriting this
      hasReachedEndRef.current = true;
      // Disable ignore flag to ensure this update goes through
      ignoreProgressUpdatesRef.current = false;
      // Update state for UI
      setCurrentSentenceIndex(lastSentenceIndex);
      // IMMEDIATELY save to DB - don't wait for debounced update
      updateProgress(lastSentenceIndex);
    }
  }, [sortedSentences?.length, updateProgress]);

  // Handle related articles becoming visible - reliable heuristic for 100% completion
  // When user scrolls far enough to see related articles footer, article is complete
  const handleRelatedArticlesVisible = useCallback(() => {
    const totalSentences = sortedSentences?.length ?? 0;
    if (totalSentences === 0) return;

    const lastSentenceIndex = totalSentences - 1;
    if (lastSentenceIndex >= 0) {
      // LOCK COMPLETION: Prevent viewability from overwriting this
      hasReachedEndRef.current = true;
      // Disable the ignore flag in case it was still set
      ignoreProgressUpdatesRef.current = false;
      // Update state for UI
      setCurrentSentenceIndex(lastSentenceIndex);
      // IMMEDIATELY save to DB - don't wait for debounced update
      updateProgress(lastSentenceIndex);
    }
  }, [sortedSentences?.length, updateProgress]);

  // Sync sentence index (for any other features that might use it)
  useEffect(() => {
    setCurrentSentenceIndexForProgress(currentSentenceIndex);
  }, [currentSentenceIndex]);

  // Scroll to position effect - triggers when all conditions are met
  // Uses DIRECT values from useReadingProgress (no capturing)
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

      // Disable progress tracking during programmatic scroll
      ignoreProgressUpdatesRef.current = true;

      // Double RAF ensures FlashList layout is complete (v2 best practice)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // If scrolling to last 2 items, use scrollToEnd (more reliable)
          const isNearEnd = targetIndex >= maxIndex - 2;

          if (isNearEnd) {
            try {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            } catch {
              // Silent error - scroll failed
            }
          } else {
            // For middle positions, use scrollToOffset with smooth animation
            try {
              // Estimate offset: use FlashList's estimated item size
              const estimatedItemSize = 100;
              const headerHeight = 400;
              const offset = headerHeight + targetIndex * estimatedItemSize;
              scrollViewRef.current?.scrollToOffset({
                offset,
                animated: true,
              });
            } catch {
              // Silent error - scroll failed
            }
          }

          // Re-enable progress tracking after scroll settles
          setTimeout(() => {
            ignoreProgressUpdatesRef.current = false;
          }, 500);

          // Show toast
          // Note: last_sentence_read is 0-based, so add 1 for accurate percentage
          const percentage = Math.round(((initialLastSentenceRead + 1) / totalSentences) * 100);
          const message = STRINGS.RESUMED_READING_TEMPLATE.replace(
            '{percent}',
            percentage.toString(),
          );
          showToast(message, 3000, ToastType.INFO);
        });
      });
    } else if (!hasScrolledToPositionRef.current && isFlashListReady) {
      // FlashList is ready but no scroll needed (new article or position 0)
      hasScrolledToPositionRef.current = true;
      ignoreProgressUpdatesRef.current = false;
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
    wordDetailsEnabled,
    handleScrollEnd,
    handleEndReached,
    handleRelatedArticlesVisible,
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
