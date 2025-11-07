import type { FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewToken } from 'react-native';

import { STRINGS } from '@/constants/strings';
import type { Tables } from '@/types/database.types';
import type { Article } from '@/types/articles.types';
import { ToastType } from '@/types/enums';
import { selectionFeedback } from '@/utils/haptics';

export interface UseArticleScrollTrackingOptions {
  /** Initial last sentence read from reading progress */
  initialLastSentenceRead: number;
  /** Whether user had existing progress when mounting */
  hadExistingProgressOnMount: boolean;
  /** Sorted sentences array */
  sortedSentences: Tables<'article_sentences'>[] | undefined;
  /** Article data */
  article: Article | null;
  /** Loading state */
  isLoadingArticle: boolean;
  /** Function to update reading progress */
  updateProgress: (sentenceIndex: number) => void;
  /** Function to show toast notifications */
  showToast: (message: string, duration: number, type: ToastType) => void;
}

/**
 * Hook managing scroll tracking and reading progress for article view
 * Handles FlashList scroll events, viewable items tracking, and scroll-to-position on mount
 *
 * Extracted from useArticleScreen to reduce complexity and improve testability
 */
export function useArticleScrollTracking({
  initialLastSentenceRead,
  hadExistingProgressOnMount,
  sortedSentences,
  article,
  isLoadingArticle,
  updateProgress,
  showToast,
}: UseArticleScrollTrackingOptions) {
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

  /**
   * Handle viewable items changed to track current sentence
   * Finds the furthest visible sentence to track progress accurately
   */
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

  /**
   * Handle scroll end to catch when user reaches the bottom
   * This ensures the last sentence is tracked even if viewable items callback doesn't fire
   */
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

  // Update reading progress whenever sentence index changes
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

  return {
    scrollViewRef,
    currentSentenceIndex,
    handleViewableItemsChanged,
    handleScrollEnd,
    handleFlashListLoad,
  };
}
