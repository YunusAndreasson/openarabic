import type { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  InteractionManager,
  View,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ArticleSentence, SentenceScrubber, WordTooltip } from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
// Removed MiniPlayer import
import { ToastProvider, useToast } from '@/components/providers';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useSentenceScrubber } from '@/hooks/articles/useSentenceScrubber';
// Removed audio-related imports
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
// Removed enhancedAudioService import
import { useAppSelectorMemo } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
// Removed handleError import
import { selectionFeedback } from '@/utils/haptics';

// Static constants to prevent recreation
const FLEX_ONE_STYLE = { flex: 1 } as const;
const RESUME_WINDOW_TIMEOUT = 1500;
const RESUME_JUMP_DELAY = 500;
const PROGRESS_THRESHOLD = 15;

// Custom comparison function for React.memo optimization
const ArticleScreenContentComparison = (
  prevProps: { id: string },
  nextProps: { id: string }
): boolean => {
  return prevProps.id === nextProps.id;
};

// Inner component with toast context access - optimized with React.memo
const ArticleScreenContent = memo(({ id }: { id: string }) => {
  const colors = useColors();
  const { user } = useAuth();
  const fontScale = useAppSelectorMemo(state => state.settings.fontScale);
  const { showToast } = useToast();

  // Removed audio-related hooks and state
  const queryClient = useQueryClient();

  const { handleScroll: handleHeaderScroll } = useHeaderVisibility();

  // Memoize article ID parsing to prevent unnecessary recalculations
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id ?? '', 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  const {
    article,
    isLoadingArticle,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isInReadingList,
    refetchReadingListStatus,
  } = useArticleData(articleId, user?.id);

  // Removed audio state check

  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Ref to track current sentence index for reading progress
  const currentSentenceIndexRef = useRef(0);

  // Ref to track if we've already handled the initial resume for this article
  const hasHandledInitialResumeRef = useRef(false);

  // Reset resume flag when article changes
  useEffect(() => {
    hasHandledInitialResumeRef.current = false;
  }, [articleId]);

  // Keep a ref to avoid handleScroll identity changes when tooltip toggles
  const activeTooltipRef = useRef<typeof activeTooltip>(null);
  useEffect(() => {
    activeTooltipRef.current = activeTooltip;
  }, [activeTooltip]);

  // Handle scroll to close tooltip and hide header with stable identity
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleHeaderScroll(event);
      if (activeTooltipRef.current) {
        setActiveTooltip(null);
      }
    },
    [handleHeaderScroll]
  );

  // Article mutations for reading list and word management
  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    async () => {
      await refetchStudyWords();
    }
  );

  // Lightweight due word roots from cache only (no extra fetching)
  const dueWordRootIds = useMemo(() => {
    if (!user?.id) return new Set<number>();
    const cachedDue = queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.due(user.id)) ?? [];
    return new Set<number>(cachedDue.map(w => w.root_id));
  }, [queryClient, user?.id]);

  const handleToggleReadingListWithFeedback = useCallback(async () => {
    if (!articleId) return;

    selectionFeedback();
    await handleToggleReadingList(articleId, isInReadingList);
    showToast(
      isInReadingList ? STRINGS.REMOVED_FROM_LISTENING_LIST : STRINGS.ADDED_TO_LISTENING_LIST,
      3000,
      'success'
    );
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  // Removed audio playback handler

  // Track reading progress with proper initialization
  const isActive = !!article && !isLoadingArticle;

  const { lastSentenceRead, updateProgress, initialLastSentenceRead, hadExistingProgressOnMount } =
    useReadingProgress({
      articleId: articleId ?? 0, // Use 0 if articleId is undefined/null
      totalSentences: sortedSentences?.length ?? 0,
      currentSentenceIndex: currentSentenceIndexRef.current,
      isActive,
    });

  // Use 0 as fallback when reading progress is not available yet
  const effectiveLastSentenceRead = lastSentenceRead ?? 0;

  // Initialize sentence scrubber with actual reading progress
  const {
    currentSentenceIndex,
    scrollViewRef,
    handleViewableItemsChanged,
    handleSentenceChange,
    handleScrubStart,
    handleScrubEnd,
    jumpToLastReadPosition,
  } = useSentenceScrubber({
    sortedSentences: sortedSentences || [],
    dueWordRootIds,
    sentenceWordsMap,
    lastSentenceRead: effectiveLastSentenceRead,
  });

  // Update the ref when currentSentenceIndex changes
  useEffect(() => {
    currentSentenceIndexRef.current = currentSentenceIndex;
  }, [currentSentenceIndex]);

  // Update reading progress when current sentence changes (but only after initial load)
  useEffect(() => {
    if (!!article && !isLoadingArticle && currentSentenceIndex >= 0) {
      updateProgress(currentSentenceIndex);
    }
  }, [currentSentenceIndex, article, isLoadingArticle, updateProgress]);

  useEffect(() => {
    if (!user?.id) return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        void refetchStudyWords?.();
      }
    });

    return () => subscription.remove();
  }, [user?.id, refetchStudyWords]);

  // Removed unused fade-in animation to avoid extra work on ready state

  // Limit resume behavior to a short window right after content becomes ready
  const resumeWindowActiveRef = useRef(false);
  useEffect(() => {
    if (article && sortedSentences && sortedSentences.length > 0 && !isLoadingArticle) {
      resumeWindowActiveRef.current = true;
      const timeoutId = setTimeout(() => {
        resumeWindowActiveRef.current = false;
      }, RESUME_WINDOW_TIMEOUT);
      return () => clearTimeout(timeoutId);
    }
    return () => {};
  }, [article, sortedSentences, isLoadingArticle]);

  // Handle initial resume when article is fully loaded
  useEffect(() => {
    // Only run once when everything is ready and we haven't handled resume yet
    if (
      !hasHandledInitialResumeRef.current &&
      !isLoadingArticle &&
      article &&
      sortedSentences &&
      sortedSentences.length > 0 &&
      hadExistingProgressOnMount &&
      resumeWindowActiveRef.current
    ) {
      const baselineLastSentence = initialLastSentenceRead ?? 0;
      const progressPercent = Math.round((baselineLastSentence / sortedSentences.length) * 100);

      // Show resume toast
      selectionFeedback();
      showToast(`Resumed at ${progressPercent}%`, 3000, 'info');

      // Attempt jump once on resume
      setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          // Primary: delegate to hook (handles measurement and safety flags)
          jumpToLastReadPosition();
          // Fallback: if progress was below threshold, force a direct scroll to ensure UX expectation
          if (progressPercent < PROGRESS_THRESHOLD && scrollViewRef.current) {
            const targetIndex = (initialLastSentenceRead ?? 0) + 1; // +1 for header
            try {
              scrollViewRef.current.scrollToIndex({
                index: targetIndex,
                animated: true,
                viewPosition: 0.1,
              });
            } catch {
              // Offset fallback if index-based scroll fails due to measurement/virtualization
              const estimatedOffset = Math.max(0, (targetIndex - 1) * LAYOUT.SENTENCE_ITEM.HEIGHT);
              try {
                scrollViewRef.current.scrollToOffset({
                  offset: estimatedOffset,
                  animated: true,
                });
              } catch {
                // noop
              }
            }
          }
        });
      }, RESUME_JUMP_DELAY);

      // Mark as handled - this prevents any further resume logic
      hasHandledInitialResumeRef.current = true;
    }
  }, [
    isLoadingArticle,
    article,
    sortedSentences,
    hadExistingProgressOnMount,
    jumpToLastReadPosition,
    showToast,
  ]);

  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      if (layout && layout.width > 0) {
        if (activeTooltip?.word.id === word.id) {
          // Close tooltip if same word is tapped again
          setActiveTooltip(null);
        } else {
          // Always open new tooltip immediately for different words
          // This will automatically close the previous tooltip due to state replacement
          setActiveTooltip({ word, layout });
        }
      }
    },
    [activeTooltip]
  );

  const handleStudyListToggle = useCallback(() => {
    if (activeTooltip?.word.root_id) {
      selectionFeedback();
      handleRootPress(activeTooltip.word.root_id);
    }
  }, [activeTooltip, handleRootPress]);

  const handleCloseTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  // removed unused handleWordPressForRenderer

  // Lightweight sentence words accessor without extra routing logic
  const getWordsForSentence = useCallback(
    (sentenceId: number) => sentenceWordsMap.get(sentenceId) ?? [],
    [sentenceWordsMap]
  );

  // Memoize renderSentenceItem to prevent unnecessary recreations
  const renderSentenceItem = useCallback(
    ({ item }: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(item.id);

      if (!words || words.length === 0) {
        return <React.Fragment />;
      }

      return (
        <ArticleSentence
          key={item.id}
          sentence={item}
          words={words}
          settings={{ showEnglish: true, fontScale }}
          colors={colors}
          dueWordRootIds={dueWordRootIds}
          onWordPress={handleWordPress}
        />
      );
    },
    [getWordsForSentence, fontScale, colors, dueWordRootIds, handleWordPress]
  );

  // Memoize expensive computations
  const hasContent = useMemo(() => !!article && !!sortedSentences, [article, sortedSentences]);

  const tooltipProps = useMemo(
    () => ({
      visible: !!activeTooltip,
      text: activeTooltip?.word.english,
      arabicWord: activeTooltip?.word.word_form,
      layout: activeTooltip?.layout ?? null,
      onClose: handleCloseTooltip,
      onStudyListToggle: handleStudyListToggle,
      wordRootId: activeTooltip?.word.root_id,
    }),
    [activeTooltip, handleCloseTooltip, handleStudyListToggle]
  );

  const sentenceScrubberProps = useMemo(
    () => ({
      currentSentence: currentSentenceIndex,
      totalSentences: sortedSentences?.length ?? 0,
      onSentenceChange: handleSentenceChange,
      onScrubStart: handleScrubStart,
      onScrubEnd: handleScrubEnd,
    }),
    [
      currentSentenceIndex,
      sortedSentences?.length,
      handleSentenceChange,
      handleScrubStart,
      handleScrubEnd,
    ]
  );

  // Only create articleContentProps when article is defined to avoid TypeScript errors
  const articleContentProps = useMemo(() => {
    if (!article) return null;

    return {
      id,
      article,
      sortedSentences,
      renderSentenceItem,
      handleScroll,
      handleViewableItemsChanged,
      colors,
      scrollViewRef: scrollViewRef as React.RefObject<FlashList<Tables<'article_sentences'>>>,
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      onClose: handleClose,
    };
  }, [
    article,
    id,
    sortedSentences,
    renderSentenceItem,
    handleScroll,
    handleViewableItemsChanged,
    colors,
    scrollViewRef,
    isInReadingList,
    handleToggleReadingListWithFeedback,
    handleClose,
  ]);

  return (
    <View style={FLEX_ONE_STYLE}>
      {hasContent && articleContentProps ? <ArticleContent {...articleContentProps} /> : null}

      {/* Removed mini-player for article modal */}

      <WordTooltip {...tooltipProps} />

      {/* Scrubber moved out of ArticleContent to avoid ArticleContent rerenders */}
      <SentenceScrubber {...sentenceScrubberProps} />
    </View>
  );
}, ArticleScreenContentComparison);

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  return (
    <ToastProvider>
      <View style={[FLEX_ONE_STYLE, { backgroundColor: colors.background }]}>
        <ArticleScreenContent id={id ?? ''} />
      </View>
    </ToastProvider>
  );
}
