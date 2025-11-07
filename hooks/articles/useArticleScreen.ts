import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';

import type { FlashListRef } from '@shopify/flash-list';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
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

  // Current sentence index for reading progress
  const [currentSentenceIndexForProgress, setCurrentSentenceIndexForProgress] = useState(0);

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

  // FlashList ready state for scroll-to-position
  const [isFlashListReady, setIsFlashListReady] = useState(false);
  const handleFlashListLoad = useCallback(() => {
    setIsFlashListReady(true);
  }, []);

  // Capture initial progress values in refs for stable scroll-to-position
  // These values should never change once captured to avoid race conditions
  const stableInitialProgressRef = useRef<{
    lastSentenceRead: number;
    hadProgress: boolean;
    captured: boolean;
  }>({
    lastSentenceRead: 0,
    hadProgress: false,
    captured: false,
  });

  // Capture initial values once when they first become available
  useEffect(() => {
    if (!stableInitialProgressRef.current.captured && !isLoadingArticle) {
      stableInitialProgressRef.current = {
        lastSentenceRead: initialLastSentenceRead,
        hadProgress: hadExistingProgressOnMount,
        captured: true,
      };
    }
  }, [initialLastSentenceRead, hadExistingProgressOnMount, isLoadingArticle]);

  // Handle viewable items changed to track current sentence
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;

      const totalSentences = sortedSentences?.length ?? 0;
      if (totalSentences === 0) return;

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
        // Sort by index
        visibleSentences.sort((a, b) => a.index - b.index);

        const firstVisibleSentence = visibleSentences[0];
        const lastVisibleSentence = visibleSentences[visibleSentences.length - 1];

        // Determine which sentence index to use
        let newSentenceIndex: number;

        // Use the maximum visible sentence index (highest sentence seen)
        // This ensures progress advances as you scroll down and reaches 100% at the end
        const maxVisibleIndex = lastVisibleSentence?.index ?? 0;

        // If the last sentence of the article is visible, ensure we use it
        const isLastSentenceVisible = maxVisibleIndex === totalSentences - 1;

        if (isLastSentenceVisible) {
          // At the end - use the last sentence to ensure 100% completion
          newSentenceIndex = totalSentences - 1;
        } else {
          // Use the maximum visible sentence index (furthest sentence seen)
          // This provides better progress tracking as you scroll
          newSentenceIndex = Math.max(maxVisibleIndex, firstVisibleSentence?.index ?? 0);
        }

        // Only update if the sentence actually changed to prevent unnecessary re-renders
        if (newSentenceIndex !== undefined && newSentenceIndex !== currentSentenceIndex) {
          setCurrentSentenceIndex(newSentenceIndex);
        }
      }
    },
    [currentSentenceIndex, sortedSentences?.length],
  );

  // Handle scroll end to catch when user reaches the bottom
  // This ensures the last sentence is tracked even if viewable items callback doesn't fire
  const handleScrollEnd = useCallback(() => {
    const totalSentences = sortedSentences?.length ?? 0;
    if (totalSentences > 0) {
      const lastSentenceIndex = totalSentences - 1;
      // Only update if we're not already at the last sentence
      if (currentSentenceIndex < lastSentenceIndex) {
        setCurrentSentenceIndex(lastSentenceIndex);
      }
    }
  }, [currentSentenceIndex, sortedSentences?.length]);

  // Sync sentence index
  useEffect(() => {
    setCurrentSentenceIndexForProgress(currentSentenceIndex);
  }, [currentSentenceIndex]);

  // Update reading progress
  useEffect(() => {
    if (!!article && !isLoadingArticle && currentSentenceIndex >= 0) {
      updateProgress(currentSentenceIndex);
    }
  }, [currentSentenceIndex, article, isLoadingArticle, updateProgress]);

  // Scroll to last read position when FlashList is ready
  // Using stable ref values to avoid race conditions from query invalidations
  useEffect(() => {
    const stableProgress = stableInitialProgressRef.current;

    if (
      isFlashListReady &&
      stableProgress.captured &&
      stableProgress.hadProgress &&
      stableProgress.lastSentenceRead > 0
    ) {
      // Use requestAnimationFrame for guaranteed timing (FlashList best practice)
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToIndex({
          index: stableProgress.lastSentenceRead + 1,
          animated: true,
          viewPosition: 0.1,
        });

        // Show toast notification
        const totalSentences = sortedSentences?.length ?? 1;
        const percentage = Math.round((stableProgress.lastSentenceRead / totalSentences) * 100);
        const message = STRINGS.RESUMED_READING_TEMPLATE.replace(
          '{percent}',
          percentage.toString(),
        );
        showToast(message, 3000, ToastType.INFO);

        // Light haptic feedback when scroll animation completes
        setTimeout(() => {
          selectionFeedback();
        }, 450);
      });
    }
  }, [isFlashListReady, sortedSentences?.length, showToast]);

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
