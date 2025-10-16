import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type LayoutRectangle, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleLanguagePreference } from '@/hooks/articles/useArticleLanguagePreference';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useSentenceScrubber } from '@/hooks/articles/useSentenceScrubber';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useAuth } from '@/hooks/auth/useAuth';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { useModalState } from '@/hooks/ui/useModalState';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { simpleAudioService } from '@/services/simpleAudioService';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { getCurrentArticleId, isAudioBusy, stopAudioSafely } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { calculateHeaderHeight } from '@/utils/gradientUtils';
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
    router.back();
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
  const { lastSentenceRead, updateProgress, initialLastSentenceRead, hadExistingProgressOnMount } =
    useReadingProgress({
      articleId: articleId ?? 0,
      totalSentences: sortedSentences?.length ?? 0,
      currentSentenceIndex: currentSentenceIndexForProgress,
      isActive,
    });

  const effectiveLastSentenceRead = lastSentenceRead ?? 0;

  // Sentence scrubber
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
    sentenceWordsMap,
    lastSentenceRead: effectiveLastSentenceRead,
    headerOffset: calculateHeaderHeight(0),
  });

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

  // Resume-on-open behavior
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
      selectionFeedback();
      showToast(STRINGS.RESUMED_READING_TEMPLATE.replace('{percent}', String(progressPercent)), 3000, ToastType.INFO);
      setTimeout(() => {
        try {
          jumpToLastReadPosition();
        } catch {
          // noop
        }
      }, RESUME_JUMP_DELAY);
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

  // Word interaction handlers
  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      if (layout && layout.width > 0) {
        if (activeTooltip?.word.id === word.id) {
          setActiveTooltip(null);
        } else {
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
      setActiveTooltip(null);
      wordDetailsModal.open(activeTooltip.word);
    }
  }, [activeTooltip, wordDetailsModal]);

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
    handleSentenceChange,
    handleScrubStart,
    handleScrubEnd,
  };
}
