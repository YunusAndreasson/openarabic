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

  // Track scroll state - one attempt per article
  const hasScrolledToPositionRef = useRef(false);
  const [isFlashListReady, setIsFlashListReady] = useState(false);
  // Prevent progress updates immediately after programmatic scroll
  const ignoreProgressUpdatesRef = useRef(true);
  // Track current position for UI, but debounce DB updates
  const pendingProgressUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset scroll state when article changes
  useEffect(() => {
    hasScrolledToPositionRef.current = false;
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
        // Sort by index
        visibleSentences.sort((a, b) => a.index - b.index);

        // Check if we're near the end (last 20% of article)
        // More lenient threshold to handle short articles and ensure 100% is reachable
        const lastVisibleSentence = visibleSentences[visibleSentences.length - 1];
        const nearEndThreshold = Math.floor(totalSentences * 0.8); // Last 20%
        const isNearEnd =
          lastVisibleSentence?.index !== undefined &&
          lastVisibleSentence.index >= nearEndThreshold;

        // Use last visible sentence if near end, otherwise use first (reading position)
        const sentenceToTrack = isNearEnd ? lastVisibleSentence : visibleSentences[0];
        const newSentenceIndex = sentenceToTrack?.index;

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

  // Handle scroll end - just a placeholder, viewableItems handles all tracking
  const handleScrollEnd = useCallback(() => {
    // Viewable items callback handles all position tracking
    // This is just here for the ArticleContent onMomentumScrollEnd prop
  }, [currentSentenceIndex]);

  // Handle reaching the end of the article - set to last sentence for 100% completion
  const handleEndReached = useCallback(() => {
    const totalSentences = sortedSentences?.length ?? 0;
    if (totalSentences === 0 || ignoreProgressUpdatesRef.current) return;

    const lastSentenceIndex = totalSentences - 1;
    if (lastSentenceIndex >= 0 && lastSentenceIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(lastSentenceIndex);
    }
  }, [sortedSentences?.length, currentSentenceIndex]);

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
              const offset = headerHeight + (targetIndex * estimatedItemSize);
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

          // Haptic feedback
          selectionFeedback();
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
    handleEndReached,
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
