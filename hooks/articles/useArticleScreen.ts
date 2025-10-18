import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type LayoutRectangle, type NativeScrollEvent, type NativeSyntheticEvent, type ViewToken } from 'react-native';

import type { FlashListRef } from '@shopify/flash-list';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleLanguagePreference } from '@/hooks/articles/useArticleLanguagePreference';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useAuth } from '@/hooks/auth/useAuth';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { useModalState } from '@/hooks/ui/useModalState';
import { enhancedAudioService } from '@/services/audioPlaylist';
import { simpleAudioService } from '@/services/audioPlayer';
import type { ArticleId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { ToastType } from '@/types/enums';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { getCurrentArticleId, isAudioBusy, stopAudioSafely } from '@/utils/audioUtils';
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
  const queryClient = useQueryClient();
  const { handleScroll: handleHeaderScroll } = useHeaderVisibility();

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id ?? '', 10);
    return isNaN(parsed) ? undefined : (parsed as ArticleId);
  }, [id]);

  // Article language preference
  const { showEnglish, toggleLanguage, isOverridden } = useArticleLanguagePreference(articleId);

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

  // Audio state
  const { isPlaying, currentArticle } = useGlobalAudioState();

  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Word details modal
  const wordDetailsModal = useModalState<SentenceWord>();

  // Local study states for immediate UI updates
  const [localStudyStates, setLocalStudyStates] = useState<Map<number, boolean>>(new Map());

  // Current sentence index for reading progress
  const [currentSentenceIndexForProgress, setCurrentSentenceIndexForProgress] = useState(0);

  // Ref to avoid handleScroll identity changes when tooltip toggles
  const activeTooltipRef = useRef<typeof activeTooltip>(null);
  useEffect(() => {
    activeTooltipRef.current = activeTooltip;
  }, [activeTooltip]);

  // Handle scroll to close tooltip
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleHeaderScroll(event);

      // Close tooltip immediately when scrolling starts
      if (activeTooltipRef.current) {
        setActiveTooltip(null);
      }
    },
    [handleHeaderScroll]
  );

  // Article mutations
  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    async () => {
      await refetchStudyWords();
    }
  );

  // Handlers with feedback
  const handleToggleReadingListWithFeedback = useCallback(async () => {
    if (!articleId) return;
    selectionFeedback();
    await handleToggleReadingList(articleId, isInReadingList);
    showToast(
      isInReadingList ? STRINGS.REMOVED_FROM_BOOKMARKS : STRINGS.ADDED_TO_BOOKMARKS,
      3000,
      ToastType.INFO
    );
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleToggleLanguageWithFeedback = useCallback(() => {
    selectionFeedback();
    toggleLanguage();
  }, [toggleLanguage]);

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
      router.push(ROUTE_PATHS.LIBRARY_TAB);
    }
  }, []);

  // Check audio availability
  const hasAudio = useMemo(() => {
    return !!(article?.audio_url || article?.audio_url_bilingual);
  }, [article?.audio_url, article?.audio_url_bilingual]);

  // Handle audio playback
  const handlePlayPress = useCallback(async () => {
    if (!articleId || !article) return;
    try {
      if (isAudioBusy()) return;
      const currentArticleId = getCurrentArticleId();
      if (isPlaying && currentArticleId === articleId) {
        selectionFeedback();
        await simpleAudioService.stop();
        return;
      }
      selectionFeedback();
      const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId, 'arabic');
      if (track) {
        const success = await simpleAudioService.play(track);
        if (!success) {
          handleError(new Error('Failed to start audio playback'), {
            toastMessage: STRINGS.AUDIO_PLAYBACK_FAILED,
          });
        }
      } else {
        handleError(new Error('Failed to generate audio track'), {
          toastMessage: STRINGS.AUDIO_GENERATION_FAILED,
        });
      }
    } catch (error) {
      handleError(error as Error, { toastMessage: STRINGS.FAILED_TO_START_AUDIO_PLAYBACK });
    }
  }, [articleId, article, isPlaying, showToast]);

  // Reading progress
  const isActive = !!article && !isLoadingArticle;
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

  // Handle viewable items changed to track current sentence
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;

      // Find all visible sentences (excluding header at index 0)
      const visibleSentences = viewableItems
        .filter(
          item =>
            typeof item.index === 'number' &&
            item.index > 0 && // Skip header
            item.isViewable === true
        )
        .map(item => ({
          index: (item.index as number) - 1, // Convert to sentence index
          item: item,
        }))
        .filter(({ index }) => index >= 0 && index < (sortedSentences?.length ?? 0));

      if (visibleSentences.length > 0) {
        // Sort by index to ensure we pick the topmost visible sentence
        visibleSentences.sort((a, b) => a.index - b.index);

        // Use the first visible sentence (top of viewport)
        const firstVisibleSentence = visibleSentences[0];
        if (firstVisibleSentence) {
          const newSentenceIndex = firstVisibleSentence.index;

          // Only update if the sentence actually changed to prevent unnecessary re-renders
          if (newSentenceIndex !== currentSentenceIndex) {
            setCurrentSentenceIndex(newSentenceIndex);
          }
        }
      }
    },
    [currentSentenceIndex, sortedSentences?.length]
  );

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
  useEffect(() => {
    if (isFlashListReady && hadExistingProgressOnMount && initialLastSentenceRead > 0) {
      scrollViewRef.current?.scrollToIndex({
        index: initialLastSentenceRead + 1,
        animated: true,
        viewPosition: 0.1,
      });

      // Show toast notification
      const totalSentences = sortedSentences?.length ?? 1;
      const percentage = Math.round((initialLastSentenceRead / totalSentences) * 100);
      const message = STRINGS.RESUMED_READING_TEMPLATE.replace('{percent}', percentage.toString());
      showToast(message, 3000, ToastType.INFO);
    }
  }, [isFlashListReady, hadExistingProgressOnMount, initialLastSentenceRead, sortedSentences?.length, showToast]);

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

  // Word interaction handlers
  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      if (layout && layout.width > 0) {
        if (activeTooltipRef.current?.word.id === word.id) {
          setActiveTooltip(null);
        } else {
          setActiveTooltip({ word, layout });
        }
      }
    },
    [] // No dependencies - uses ref for stable callback identity
  );

  const handleCloseTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  const handleOpenWordDetails = useCallback(() => {
    const tooltip = activeTooltipRef.current;
    if (tooltip?.word) {
      setActiveTooltip(null);
      wordDetailsModal.open(tooltip.word);
    }
  }, [wordDetailsModal]);

  const handleAddWordToStudy = useCallback(
    async (word: SentenceWord) => {
      if (!user?.id || !word.root_id) return;
      selectionFeedback();
      const result = await handleRootPress(word.root_id);
      if (result === undefined) return;
      const isNowInStudy = result;
      setLocalStudyStates(prev => {
        const next = new Map(prev);
        next.set(word.root_id, isNowInStudy);
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
      await queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) });
      await queryClient.invalidateQueries({
        queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
      });
      await refetchStudyWords?.();
    },
    [user?.id, handleRootPress, queryClient, refetchStudyWords]
  );

  // Compute isInStudyList for word details bottom sheet
  const isInStudyList = useMemo(() => {
    if (!wordDetailsModal.data?.root_id) return false;
    const localState = localStudyStates.get(wordDetailsModal.data.root_id);
    if (localState !== undefined) return localState;
    if (!user?.id) return false;
    const allWords = queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(user.id)) ?? [];
    return allWords.some(word => word.root_id === wordDetailsModal.data?.root_id);
  }, [wordDetailsModal.data?.root_id, localStudyStates, user?.id, queryClient]);

  return {
    isLoadingArticle,
    article,
    sortedSentences,
    sentenceWordsMap,
    showEnglish,
    isOverridden,
    isInReadingList,
    hasAudio,
    isPlaying: isPlaying && currentArticle?.id === articleId,
    currentSentenceIndex,
    scrollViewRef,
    activeTooltip,
    wordDetailsModal,
    isInStudyList,
    // Handlers
    handleScroll,
    handleViewableItemsChanged,
    handleToggleReadingListWithFeedback,
    handleToggleLanguageWithFeedback,
    handlePlayPress,
    handleClose,
    handleWordPress,
    handleCloseTooltip,
    handleOpenWordDetails,
    handleAddWordToStudy,
    handleFlashListLoad,
  };
}
