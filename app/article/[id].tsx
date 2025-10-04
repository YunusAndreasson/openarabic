import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  View,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArticleSentence,
  SentenceScrubber,
  WordDetailsBottomSheet,
  WordTooltip,
} from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider, useToast } from '@/components/providers';
import PulsatingLoader from '@/components/ui/PulsatingLoader';
import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useSentenceScrubber } from '@/hooks/articles/useSentenceScrubber';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { simpleAudioService } from '@/services/simpleAudioService';
import { useAppSelectorMemo } from '@/store/hooks';
import type { ArticleId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { ToastType } from '@/types/enums';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { calculateHeaderHeight } from '@/utils/gradientUtils';
import { lightFeedback } from '@/utils/haptics';

// Static constants to prevent recreation
const FLEX_ONE_STYLE = { flex: 1 } as const;

// Static styles for loading container
const LOADING_CONTAINER_STYLE = {
  flex: 1,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
} as const;

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
  const displayLanguagePreference = useAppSelectorMemo(
    state => state.settings.displayLanguagePreference
  );
  const audioPreference = useAppSelectorMemo(state => state.settings.audioLanguagePreference);
  const { showToast } = useToast();

  const queryClient = useQueryClient();

  const { handleScroll: handleHeaderScroll } = useHeaderVisibility();

  // Note: header height not needed for current auto-scroll logic

  // Memoize article ID parsing to prevent unnecessary recalculations
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id ?? '', 10);
    return isNaN(parsed) ? undefined : (parsed as ArticleId);
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

  // Audio state for synchronization
  const { isPlaying, currentArticle } = useGlobalAudioState();

  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  const [wordDetailsBottomSheet, setWordDetailsBottomSheet] = useState<{
    isVisible: boolean;
    word: SentenceWord | null;
  }>({
    isVisible: false,
    word: null,
  });

  // Track button state locally for immediate UI updates
  const [localStudyStates, setLocalStudyStates] = useState<Map<number, boolean>>(new Map());

  // Ref to track current sentence index for reading progress
  const currentSentenceIndexRef = useRef(0);

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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await handleToggleReadingList(articleId, isInReadingList);
    showToast(
      isInReadingList ? STRINGS.REMOVED_FROM_BOOKMARKS : STRINGS.ADDED_TO_BOOKMARKS,
      3000,
      ToastType.SUCCESS
    );
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleClose = useCallback(async () => {
    // Stop audio playback completely before navigating away
    try {
      const status = simpleAudioService.getStatus();
      if (status.isPlaying || status.isLoading) {
        await simpleAudioService.stop();
      }
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Failed to stop audio on close' });
    }

    router.back();
  }, []);

  // Check if article has audio available
  const hasAudio = useMemo(() => {
    const hasAudioUrls = !!(article?.audio_url || article?.audio_url_bilingual);

    return hasAudioUrls;
  }, [article?.audio_url, article?.audio_url_bilingual, articleId]);

  // Handle play button press
  const handlePlayPress = useCallback(async () => {
    if (!articleId || !article) return;

    try {
      const status = simpleAudioService.getStatus();
      if (status.isLoading) return;

      const currentArticleId = status.currentTrack?.articleId
        ? parseInt(status.currentTrack.articleId.toString(), 10)
        : undefined;

      if (isPlaying && currentArticleId === articleId) {
        // Currently playing this article, so stop completely
        lightFeedback();
        await simpleAudioService.stop();
        return;
      }

      // Generate fresh audio track for this article
      // Always use Arabic audio for word highlighting to match timestamps
      lightFeedback();

      const track = await enhancedAudioService.generateEnhancedAudioTrack(
        articleId,
        'arabic' // Force Arabic audio for word highlighting
      );

      if (track) {
        const success = await simpleAudioService.play(track);
        if (!success) {
          handleError(new Error('Failed to start audio playback'), {
            toastMessage: 'Audio playback failed',
          });
        }
      } else {
        handleError(new Error('Failed to generate audio track'), {
          toastMessage: 'Audio generation failed',
        });
      }
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Failed to handle play press' });
    }
  }, [articleId, article, isPlaying, audioPreference, showToast]);

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
    headerOffset: calculateHeaderHeight(0),
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

  // Cleanup scroll timeout and audio on unmount
  useEffect(() => {
    return () => {
      // Stop audio playback when component unmounts
      const stopAudioOnUnmount = async () => {
        try {
          const status = simpleAudioService.getStatus();
          if (status.isPlaying || status.isLoading) {
            await simpleAudioService.stop();
          }
        } catch (error) {
          handleError(error as Error, { toastMessage: 'Failed to stop audio on unmount' });
        }
      };

      // Don't await this - let it run in background
      stopAudioOnUnmount();
    };
  }, []);

  // Resume-on-open behavior (original working behavior)
  const hasHandledInitialResumeRef = useRef(false);
  const RESUME_WINDOW_TIMEOUT = 1500;
  const RESUME_JUMP_DELAY = 500;

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

  useEffect(() => {
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(`Resumed at ${progressPercent}%`, 3000, ToastType.INFO);

      // Attempt jump once on resume
      setTimeout(() => {
        // Primary: delegate to hook (handles measurement and safety flags)
        try {
          jumpToLastReadPosition();
        } catch {
          // noop
        }
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
          setActiveTooltip({ word, layout });
        }
      }
    },
    [activeTooltip]
  );

  const handleCloseTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  const handleOpenWordDetails = useCallback(() => {
    if (activeTooltip?.word) {
      // Close the tooltip first to avoid layering conflicts
      setActiveTooltip(null);

      // Then open the bottom sheet
      setWordDetailsBottomSheet({
        isVisible: true,
        word: activeTooltip.word,
      });
    }
  }, [activeTooltip]);

  const handleCloseWordDetails = useCallback(() => {
    setWordDetailsBottomSheet({
      isVisible: false,
      word: null,
    });
  }, []);

  const handleAddWordToStudy = useCallback(
    async (word: SentenceWord) => {
      if (!user?.id || !word.root_id) return;

      // Direct haptic feedback without debounce (same as Play Audio)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Add/remove the word to/from study list first
      const result = await handleRootPress(word.root_id);

      // If operation failed (daily limit reached), don't update local state
      if (result === undefined) {
        return;
      }

      // Use the mutation result directly to determine new state
      const isNowInStudy = result;

      // Update local state immutably to reflect the new state
      setLocalStudyStates(prev => {
        const next = new Map(prev);
        next.set(word.root_id, isNowInStudy);
        return next;
      });

      // Invalidate queries to sync with backend
      await queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
      await queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) });
      await queryClient.invalidateQueries({
        queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
      });

      // Refetch study words data
      await refetchStudyWords?.();

      // Keep bottom sheet open for additional interactions
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localStudyStates not needed in deps because we use functional update pattern (setLocalStudyStates(prev => ...))
    [user?.id, handleRootPress, queryClient, refetchStudyWords]
  );

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
          settings={{
            showEnglish: displayLanguagePreference === 'bilingual',
            fontScale,
          }}
          colors={colors}
          dueWordRootIds={dueWordRootIds}
          onWordPress={handleWordPress}
        />
      );
    },
    [
      getWordsForSentence,
      fontScale,
      colors,
      dueWordRootIds,
      handleWordPress,
      displayLanguagePreference,
    ]
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
      onOpenWordDetails: handleOpenWordDetails,
    }),
    [activeTooltip, handleCloseTooltip, handleOpenWordDetails]
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
      scrollViewRef: scrollViewRef as React.RefObject<any>,
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      hasAudio,
      isPlaying: isPlaying && currentArticle?.id === articleId,
      onPlayPress: handlePlayPress,
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
    hasAudio,
    isPlaying,
    currentArticle?.id,
    articleId,
    handlePlayPress,
    handleClose,
  ]);

  // Show loader while article is loading
  if (isLoadingArticle) {
    return (
      <View style={LOADING_CONTAINER_STYLE}>
        <PulsatingLoader size={64} />
      </View>
    );
  }

  return (
    <>
      {hasContent && articleContentProps ? <ArticleContent {...articleContentProps} /> : null}

      {/* Removed mini-player for article modal */}

      <WordTooltip {...tooltipProps} />

      <WordDetailsBottomSheet
        isVisible={wordDetailsBottomSheet.isVisible}
        onClose={handleCloseWordDetails}
        word={wordDetailsBottomSheet.word}
        onAddToStudy={handleAddWordToStudy}
        isInStudyList={
          wordDetailsBottomSheet.word?.root_id
            ? localStudyStates.get(wordDetailsBottomSheet.word.root_id) ??
              (user?.id
                ? (() => {
                    const allWords =
                      queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(user.id)) ?? [];
                    return allWords.some(
                      word => word.root_id === wordDetailsBottomSheet.word?.root_id
                    );
                  })()
                : false)
            : false
        }
      />

      {/* Scrubber moved out of ArticleContent to avoid ArticleContent rerenders */}
      {!wordDetailsBottomSheet.isVisible && <SentenceScrubber {...sentenceScrubberProps} />}
    </>
  );
}, ArticleScreenContentComparison);

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const Container = Platform.OS === 'android' ? SafeAreaView : View;
  const containerProps =
    Platform.OS === 'android'
      ? ({
          style: [FLEX_ONE_STYLE, { backgroundColor: colors.background }],
          edges: ['top'] as const,
        } as const)
      : ({ style: [FLEX_ONE_STYLE, { backgroundColor: colors.background }] } as const);

  return (
    <ToastProvider>
      <Container {...(containerProps as any)}>
        <ArticleScreenContent id={id ?? ''} />
      </Container>
    </ToastProvider>
  );
}
