import type { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
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

import {
  ArticleSentence,
  SentenceScrubber,
  WordDetailsBottomSheet,
  WordTooltip,
} from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider, useToast } from '@/components/providers';
import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useSentenceScrubber } from '@/hooks/articles/useSentenceScrubber';
import { useWordTimestamps } from '@/hooks/articles/useWordTimestamps';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { simpleAudioService } from '@/services/simpleAudioService';
import { useAppSelectorMemo } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import { ToastType } from '@/types/enums';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

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
  const displayLanguagePreference = useAppSelectorMemo(
    state => state.settings.displayLanguagePreference
  );
  const audioPreference = useAppSelectorMemo(state => state.settings.audioLanguagePreference);
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

  // Word timestamps for audio synchronization
  const { wordTimestamps, hasTimestamps, getCurrentWordIndex } = useWordTimestamps(
    articleId ?? null
  );

  // Audio state for synchronization
  const { position, isPlaying, currentArticle } = useGlobalAudioState();

  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Track current highlighted word for audio synchronization
  const [currentHighlightedWord, setCurrentHighlightedWord] = useState<SentenceWord | null>(null);

  // Position smoothing to handle timing variations
  const lastStablePosition = useRef<number>(0);

  // Create mapping from global word index to actual word
  const wordIndexToWordMap = useMemo(() => {
    const wordMap = new Map<number, SentenceWord>();

    if (!sortedSentences.length) return wordMap;

    let globalWordIndex = 0;

    for (let sentenceIdx = 0; sentenceIdx < sortedSentences.length; sentenceIdx++) {
      const sentence = sortedSentences[sentenceIdx];
      if (!sentence) continue;

      const sentenceWords = sentenceWordsMap.get(sentence.id);

      if (sentenceWords && sentenceWords.length > 0) {
        for (const word of sentenceWords) {
          wordMap.set(globalWordIndex, word);
          globalWordIndex++;
        }
      }
    }

    return wordMap;
  }, [sortedSentences, sentenceWordsMap]);

  // Auto-scroll state
  const lastScrolledWordIndex = useRef<number>(-1);
  const lastScrollTime = useRef<number>(0);
  const autoScrollEnabled = useRef(true);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Disable auto-scroll temporarily when user scrolls manually
      autoScrollEnabled.current = false;

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Re-enable auto-scroll after user stops scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        autoScrollEnabled.current = true;
      }, 1000); // Re-enable after 1 second of no scrolling
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
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

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

  // Update highlighted word based on audio position with enhanced sync logic
  useEffect(() => {
    if (!hasTimestamps || !isPlaying || !currentArticle || currentArticle.id !== articleId) {
      setCurrentHighlightedWord(null);
      return;
    }

    if (typeof position !== 'number' || isNaN(position)) {
      setCurrentHighlightedWord(null);
      return;
    }

    const wordIndex = getCurrentWordIndex(position);

    // Position smoothing: Filter out major jumps but allow normal progression
    const positionDiff = Math.abs(position - lastStablePosition.current);
    lastStablePosition.current = position;

    // Skip updates if position jumped more than 3 seconds (likely a seek or buffering issue)
    if (positionDiff > 3.0) {
      return;
    }

    // Enhanced sync: Handle common desync scenarios including timestamp gaps
    let finalWordIndex = wordIndex;

    // Scenario 1: Audio position is ahead of timestamps (common after buffering or gaps)
    if (wordIndex === -1 && position > 0) {
      const lastWord = wordTimestamps[wordTimestamps.length - 1];

      if (lastWord && position > lastWord.end_time) {
        // If we're significantly beyond the last timestamp, timestamps might be incomplete
        if (position - lastWord.end_time > 5) {
          return; // Let useWordTimestamps handle incomplete timestamps
        }
        return; // Let useWordTimestamps handle incomplete timestamps
      }

      // Scenario 2: Audio jumped ahead due to buffering, find closest word
      const closestWord = wordTimestamps.reduce((closest, current) => {
        const currentDiff = Math.min(
          Math.abs(position - current.start_time),
          Math.abs(position - current.end_time)
        );
        const closestDiff = Math.min(
          Math.abs(position - closest.start_time),
          Math.abs(position - closest.end_time)
        );
        return currentDiff < closestDiff ? current : closest;
      });

      // Enhanced recovery: Handle timestamp gaps between sentences
      const diff = Math.min(
        Math.abs(position - closestWord.start_time),
        Math.abs(position - closestWord.end_time)
      );

      // More aggressive recovery for timestamp gaps (up to 3 seconds)
      if (diff <= 3.0) {
        finalWordIndex = closestWord.word_index;
      }
    }

    // Scenario 3: Audio position is before first word (early playback)
    if (finalWordIndex === -1 && position >= 0) {
      const firstWord = wordTimestamps[0];
      if (firstWord && position < firstWord.start_time && position >= firstWord.start_time - 2) {
        // If we're within 2 seconds of the first word, don't highlight anything yet
        return;
      }
    }

    // Get the actual word object and only update if it has changed
    const newHighlightedWord =
      finalWordIndex !== -1 ? wordIndexToWordMap.get(finalWordIndex) || null : null;

    setCurrentHighlightedWord(prevWord => {
      const prevId = prevWord?.id;
      const newId = newHighlightedWord?.id;
      return prevId !== newId ? newHighlightedWord : prevWord;
    });
  }, [
    position,
    isPlaying,
    hasTimestamps,
    currentArticle,
    articleId,
    getCurrentWordIndex,
    wordTimestamps,
    wordIndexToWordMap,
  ]);

  // Auto-scroll to highlighted word using proper FlashList positioning
  const autoScrollToWord = useCallback(
    (word: SentenceWord | null) => {
      if (!autoScrollEnabled.current || !word || !scrollViewRef.current || !sortedSentences) {
        return;
      }

      // Don't scroll if we've already scrolled to this word recently (within 3 seconds)
      const currentTime = Date.now();
      const timeSinceLastScroll = currentTime - lastScrollTime.current;
      if (lastScrolledWordIndex.current === word.id && timeSinceLastScroll < 3000) {
        return;
      }

      // Find which sentence contains this word
      let targetSentenceIndex = -1;

      for (let sentenceIdx = 0; sentenceIdx < sortedSentences.length; sentenceIdx++) {
        const sentence = sortedSentences[sentenceIdx];
        if (!sentence) continue;

        const sentenceWords = sentenceWordsMap.get(sentence.id);

        if (sentenceWords && sentenceWords.length > 0) {
          if (sentenceWords.includes(word)) {
            targetSentenceIndex = sentenceIdx;
            break;
          }
        }
      }

      if (targetSentenceIndex === -1) return;

      // FlashList index = sentence index + 1 (to account for header component)
      const flashListIndex = targetSentenceIndex + 1;

      // Primary method: scrollToIndex with optimal positioning
      try {
        scrollViewRef.current.scrollToIndex({
          index: flashListIndex,
          animated: true,
          viewPosition: 0.7, // Position highlighted sentence 70% from top for maximum comfort
        });
        lastScrolledWordIndex.current = word.id;
        lastScrollTime.current = Date.now();
      } catch {
        // Essential fallback: offset-based scrolling using accurate constants
        const targetOffset = targetSentenceIndex * LAYOUT.SENTENCE_ITEM.HEIGHT;
        scrollViewRef.current.scrollToOffset({
          offset: Math.max(0, targetOffset),
          animated: true,
        });
        lastScrolledWordIndex.current = word.id;
        lastScrollTime.current = Date.now();
      }
    },
    [sortedSentences, sentenceWordsMap, scrollViewRef]
  );

  // Trigger auto-scroll when highlighted word changes
  useEffect(() => {
    if (currentHighlightedWord && hasTimestamps && isPlaying) {
      autoScrollToWord(currentHighlightedWord);
    }
  }, [currentHighlightedWord, hasTimestamps, isPlaying, autoScrollToWord]);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(`Resumed at ${progressPercent}%`, 3000, ToastType.INFO);

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

      // Get current state after the operation
      const isNowInStudy =
        localStudyStates.get(word.root_id) ??
        (() => {
          const allWords =
            queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(user.id)) ?? [];
          return allWords.some(studyWord => studyWord.root_id === word.root_id);
        })();

      // Update local state to reflect the new state
      setLocalStudyStates(prev => new Map(prev.set(word.root_id, isNowInStudy)));

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
    [user?.id, handleRootPress, queryClient, refetchStudyWords, localStudyStates]
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
          currentHighlightedWord={currentHighlightedWord}
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
      currentHighlightedWord,
    ]
  );

  // Memoize expensive computations
  const hasContent = useMemo(() => !!article && !!sortedSentences, [article, sortedSentences]);

  const tooltipProps = useMemo(
    () => ({
      visible: !!activeTooltip,
      text: activeTooltip?.word.english,
      arabicWord: activeTooltip?.word.word_form,
      wordId: activeTooltip?.word.id,
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
      scrollViewRef: scrollViewRef as React.RefObject<FlashList<Tables<'article_sentences'>>>,
      isInReadingList,
      onToggleReadingList: handleToggleReadingListWithFeedback,
      hasAudio,
      isPlaying: isPlaying && currentArticle?.id === articleId,
      onPlayPress: handlePlayPress,
      currentHighlightedWord,
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
    currentHighlightedWord,
    handleClose,
  ]);

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

  return (
    <ToastProvider>
      <View style={[FLEX_ONE_STYLE, { backgroundColor: colors.background }]}>
        <ArticleScreenContent id={id ?? ''} />
      </View>
    </ToastProvider>
  );
}
