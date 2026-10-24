import { router } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { AppState, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { FlashListRef, ViewToken } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { OnboardingStep } from '@/constants/onboarding';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { analytics } from '@/services/analytics';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useReadingListMutations } from '@/hooks/articles/useReadingListMutations';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useArticleWordInteractions } from '@/hooks/articles/useArticleWordInteractions';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAppSelectorShallow } from '@/store/hooks';
import type { ArticleId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { ToastType } from '@/types/enums';
import { stopNonPlaylistAudioSafely } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { markOnboardingStep } from '@/utils/onboardingStorage';

export interface UseArticleScreenOptions {
  id: string;
  showToast: (message: string, duration: number, type: ToastType) => void;
  disableAutoScroll?: boolean;
  targetSentenceId?: number;
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
  targetSentenceId,
}: UseArticleScreenOptions) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const readerTopClearance = insets.top + MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.SMALL;

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = Number(id);
    return Number.isSafeInteger(parsed) && parsed > 0 ? (parsed as ArticleId) : undefined;
  }, [id]);

  // Article data
  const {
    article,
    isLoadingArticle,
    isArticleError,
    refetchArticle,
    sortedSentences,
    sentenceWordsMap,
    selectedWordIds,
    refetchStudyWords,
    isLoadingStudyWords,
    isInReadingList,
  } = useArticleData(articleId, user?.id);

  // Track article viewed (once per article load)
  const hasTrackedArticleView = useRef(false);
  useEffect(() => {
    if (article && !hasTrackedArticleView.current) {
      hasTrackedArticleView.current = true;
      void analytics.track(ANALYTICS_EVENTS.ARTICLE_VIEWED, {
        article_id: article.id,
        article_title: article.title,
        category: article.category.name,
      });
      void markOnboardingStep(OnboardingStep.READ_TEXT);
    }
  }, [article]);

  // Article mutations - using focused hooks directly
  const { handleToggleReadingList } = useReadingListMutations();
  const { handleRootPress } = useStudyWordMutations(async () => {
    await refetchStudyWords();
  });

  // Reading preference: default is tap-to-open-card; opt-in tooltip-first.
  // Guard for existing installs whose persisted settings predate this field.
  const showTooltipFirst = useAppSelectorShallow(
    state => state.settings.wordTapShowsTooltip ?? false,
  );

  // Word interactions (tooltips, modal, study state)
  const {
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    handleWordPress,
    handleWordLongPress,
    handleCloseTooltip,
    handleBackgroundPress,
    handleOpenWordDetails,
    handleAddWordToStudy,
    closeTooltipOnScroll,
  } = useArticleWordInteractions({
    handleRootPress,
    refetchStudyWords,
    showTooltipFirst,
  });

  // Handle scroll to close tooltip
  const handleScroll = useCallback(
    (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Close tooltip when scrolling starts
      closeTooltipOnScroll();
    },
    [closeTooltipOnScroll],
  );

  // Handlers with feedback. No haptic here: the GlassIconButton that calls this
  // fires the press's own selection tick, and one decision gets one haptic.
  const handleToggleReadingListWithFeedback = useCallback(async () => {
    if (!articleId) return;
    const succeeded = await handleToggleReadingList(articleId, isInReadingList);
    if (!succeeded) return;
    showToast(
      isInReadingList ? STRINGS.REMOVED_FROM_BOOKMARKS : STRINGS.ADDED_TO_BOOKMARKS,
      3000,
      ToastType.INFO,
    );
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleClose = useCallback(async () => {
    try {
      await stopNonPlaylistAudioSafely(true);
    } catch (error) {
      void handleError(error, { toastMessage: STRINGS.FAILED_TO_STOP_AUDIO_ON_CLOSE });
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
  const {
    isInitialProgressReady,
    initialLastSentenceRead,
    hadExistingProgressOnMount,
    scheduleProgressUpdate,
  } = useReadingProgress({
    articleId: articleId ?? (0 as ArticleId),
    totalSentences: sortedSentences?.length ?? 0,
    isActive,
  });

  // Track current sentence for reading progress
  const scrollViewRef = useRef<FlashListRef<Tables<'article_sentences'>> | null>(null);
  // High water mark: the furthest sentence the user has reached (never decreases)
  const highWaterMarkRef = useRef(0);

  // Track scroll state - one attempt per article
  const hasScrolledToPositionRef = useRef(false);
  const [isFlashListReady, setIsFlashListReady] = useState(false);

  // Reset scroll state when article changes. Resetting refs + tied UI state together when
  // the articleId key changes is a legitimate "reset on prop change" use case.
  useEffect(() => {
    hasScrolledToPositionRef.current = false;
    highWaterMarkRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFlashListReady(false);
  }, [articleId]);

  const handleFlashListLoad = useCallback(() => {
    setIsFlashListReady(true);
  }, []);

  // Handle viewable items changed to track current sentence
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<unknown>[] }) => {
      if (viewableItems.length === 0) return;

      const totalSentences = sortedSentences?.length ?? 0;
      if (totalSentences === 0) return;

      // Find the highest visible sentence index from viewable items.
      // FlashList v2 ViewToken.index indexes props.data directly — the
      // ListHeaderComponent renders outside the virtualized collection,
      // so index 0 is the first sentence.
      let maxVisibleSentenceIndex = -1;
      for (const item of viewableItems) {
        if (typeof item.index === 'number') {
          const sentenceIndex = item.index;
          if (sentenceIndex >= 0 && sentenceIndex < totalSentences) {
            // For the last sentence, count it as viewed even if partially visible
            // (the viewability threshold can prevent it from registering at the bottom)
            const isVisible = item.isViewable || sentenceIndex === totalSentences - 1;
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
          scheduleProgressUpdate(newHighWater);
        }
      }
    },
    [sortedSentences.length, scheduleProgressUpdate],
  );

  // Handle scroll end - placeholder for ArticleContent onMomentumScrollEnd prop
  const handleScrollEnd = useCallback(() => {
    // No-op: viewable items callback handles all position tracking
  }, []);

  // Scroll to position effect - triggers when all conditions are met
  useEffect(() => {
    const totalSentences = sortedSentences?.length ?? 0;
    const requestedIndex = sortedSentences.findIndex(sentence => sentence.id === targetSentenceId);
    const canResume =
      !disableAutoScroll && hadExistingProgressOnMount && initialLastSentenceRead > 0;

    if (
      !hasScrolledToPositionRef.current &&
      isInitialProgressReady &&
      isFlashListReady &&
      !isLoadingArticle &&
      article &&
      (requestedIndex >= 0 || canResume) &&
      totalSentences > 0
    ) {
      // FlashList v2 scrollToIndex takes props.data indices (the header
      // offset is added internally), so the target is the sentence index
      // itself: put the requested or last-read sentence below the floating toolbar.
      const targetIndex =
        requestedIndex >= 0
          ? requestedIndex
          : Math.min(initialLastSentenceRead, totalSentences - 1);

      // Index 0 means the reader barely started — no scroll or toast needed.
      if (targetIndex < 1 && requestedIndex < 0) {
        hasScrolledToPositionRef.current = true;
        return;
      }

      if (!scrollViewRef.current) {
        return;
      }

      hasScrolledToPositionRef.current = true;

      // Initialize high water mark to the destination so viewability
      // tracking only records progress beyond it.
      highWaterMarkRef.current = targetIndex;

      // Double RAF ensures FlashList layout is complete (v2 best practice)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            void scrollViewRef.current?.scrollToIndex({
              index: targetIndex,
              animated: true,
              viewPosition: 0,
              // FlashList v2 adds viewOffset to the scroll offset, so a
              // negative value leaves space above the resumed sentence.
              viewOffset: -readerTopClearance,
            });
          } catch {
            // Silent error - scroll failed
          }

          // Opening a specific example is navigation, not a saved-position resume.
          if (requestedIndex >= 0) return;

          // Show toast
          const percentage = Math.round(((targetIndex + 1) / totalSentences) * 100);
          const message = STRINGS.RESUMED_READING_TEMPLATE.replace(
            '{percent}',
            percentage.toString(),
          );
          showToast(message, 3000, ToastType.INFO);
        });
      });
    } else if (
      !hasScrolledToPositionRef.current &&
      isInitialProgressReady &&
      isFlashListReady &&
      !isLoadingArticle &&
      article
    ) {
      hasScrolledToPositionRef.current = true;
    }
  }, [
    isFlashListReady,
    isInitialProgressReady,
    isLoadingArticle,
    article,
    sortedSentences,
    disableAutoScroll,
    targetSentenceId,
    hadExistingProgressOnMount,
    initialLastSentenceRead,
    showToast,
    readerTopClearance,
  ]);

  // Refetch on app state change — useEffectEvent keeps the listener stable so
  // it doesn't tear down whenever refetchStudyWords identity churns.
  const handleAppStateChange = useEffectEvent((nextAppState: string) => {
    if (nextAppState === 'active') {
      void refetchStudyWords?.();
    }
  });

  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user?.id]);

  // Cleanup leaked word-preview audio on unmount. Playlist-mode audio
  // (article Listen / Play All) keeps playing — the MiniPlayer controls it.
  useEffect(() => {
    return () => {
      void stopNonPlaylistAudioSafely();
    };
  }, []);

  return {
    isLoadingArticle,
    // A request that failed for an article that may well exist — retryable.
    // One the catalogue does not list stays `!article`, i.e. "not found".
    isArticleError,
    refetchArticle,
    // A malformed or missing `id` route param (articleId undefined) is a
    // broken link, never a real article — distinct from a well-formed id
    // that simply doesn't resolve to a row. Lets the screen tell the two
    // apart instead of rendering nothing for either.
    hasValidArticleId: articleId !== undefined,
    article,
    sortedSentences,
    sentenceWordsMap,
    selectedWordIds,
    isInReadingList,
    scrollViewRef,
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    isLoadingStudyWords,
    handleScrollEnd,
    // Handlers
    handleScroll,
    handleViewableItemsChanged,
    handleToggleReadingListWithFeedback,
    handleClose,
    handleWordPress,
    handleWordLongPress,
    handleCloseTooltip,
    handleBackgroundPress,
    handleOpenWordDetails,
    handleAddWordToStudy,
    handleFlashListLoad,
  };
}
