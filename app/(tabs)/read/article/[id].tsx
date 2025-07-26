import type { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  View,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ArticleSentence, WordTooltip } from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { MiniPlayer } from '@/components/audio';
import { ToastProvider, useToast } from '@/components/providers';
import { TIMING_CONFIG } from '@/constants/animation';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useArticleRenderers } from '@/hooks/articles/useArticleRenderers';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useSentenceScrubber } from '@/hooks/articles/useSentenceScrubber';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useHeaderVisibility } from '@/hooks/ui/useHeaderVisibility';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { useAppSelectorMemo } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';

const FLEX_ONE_STYLE = { flex: 1 } as const;

// Inner component with toast context access
const ArticleScreenContent = ({ id }: { id: string }) => {
  const colors = useColors();
  const { user } = useAuth();
  const fontScale = useAppSelectorMemo(state => state.settings.fontScale);
  const { showToast } = useToast();

  const audioPlayer = useSimpleAudioPlayer();
  const globalAudioState = useGlobalAudioState();

  const { handleScroll: handleHeaderScroll } = useHeaderVisibility();

  // Add fade-in animation for smooth content appearance
  const { fadeIn } = useOpacityAnimation({
    initialOpacity: 0,
    duration: TIMING_CONFIG.GENTLE.duration,
    autoStart: false,
  });

  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id ?? '', 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  const {
    article,
    isLoadingArticle,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isInReadingList,
    refetchReadingListStatus,
  } = useArticleData(articleId, user?.id);

  // Simplified audio state check
  const isCurrentArticlePlaying = useMemo(() => {
    const currentArticleId = audioPlayer.currentTrack?.articleId
      ? parseInt(audioPlayer.currentTrack.articleId.toString(), 10)
      : null;
    // Check both that it's the current article AND that it's actually playing
    return currentArticleId === articleId && audioPlayer.isPlaying;
  }, [audioPlayer.currentTrack?.articleId, audioPlayer.isPlaying, articleId]);

  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Ref to track current sentence index for reading progress
  const currentSentenceIndexRef = useRef(0);

  // Ref to track if resume has been triggered for this session
  const hasResumedRef = useRef(false);

  // Handle scroll to close tooltip and hide header
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleHeaderScroll(event);
      // Close tooltip when user scrolls
      if (activeTooltip) {
        setActiveTooltip(null);
      }
    },
    [handleHeaderScroll, activeTooltip]
  );

  // Article mutations for reading list and word management
  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    async () => {
      await refetchStudyWords();
    }
  );

  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  const handleToggleReadingListWithFeedback = useCallback(async () => {
    if (!articleId) return;

    selectionFeedback();
    await handleToggleReadingList(articleId, isInReadingList);
    showToast(isInReadingList ? 'Removed from playlist' : 'Added to playlist', 3000, 'success');
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  // Handle audio playback for single article
  const handlePlayPress = useCallback(async () => {
    if (!articleId) return;

    try {
      selectionFeedback();

      if (isCurrentArticlePlaying) {
        await audioPlayer.stop();
        return;
      }

      const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId);
      if (track) {
        const success = await audioPlayer.play(track);
        if (success) {
          globalAudioState.onSleepTimerClose();
        }
      }
    } catch (error) {
      handleError(error as Error);
    }
  }, [articleId, isCurrentArticlePlaying, audioPlayer, globalAudioState]);

  // Track reading progress with proper initialization
  const isActive = !!article && !isLoadingArticle;

  const { lastSentenceRead, updateProgress } = useReadingProgress({
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
    if (
      !!article &&
      !isLoadingArticle &&
      currentSentenceIndex >= 0 &&
      currentSentenceIndexRef.current > 0
    ) {
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

  // Trigger fade-in when article content is ready
  useEffect(() => {
    if (article && sortedSentences && sortedSentences.length > 0 && !isLoadingArticle) {
      fadeIn();
    }
  }, [article, sortedSentences, isLoadingArticle, fadeIn]);

  // Show toast when resuming reading progress and handle automatic scrolling
  useEffect(() => {
    if (
      effectiveLastSentenceRead > 0 &&
      sortedSentences &&
      sortedSentences.length > 0 &&
      !hasResumedRef.current &&
      !isLoadingArticle // Only trigger when article is fully loaded
    ) {
      const progressPercent = Math.round(
        (effectiveLastSentenceRead / sortedSentences.length) * 100
      );

      // Show resume toast using the proper Toast component
      selectionFeedback();
      showToast(`Resumed at ${progressPercent}%`, 3000, 'success');

      // Automatically jump to last read position if progress is 15% or more
      if (progressPercent >= 15) {
        // Small delay to ensure the article is fully loaded
        const jumpTimer = setTimeout(() => {
          jumpToLastReadPosition();
        }, 500);

        // Mark as resumed to prevent multiple triggers
        hasResumedRef.current = true;

        return () => {
          clearTimeout(jumpTimer);
        };
      }
    }

    return undefined;
  }, [
    effectiveLastSentenceRead,
    sortedSentences,
    jumpToLastReadPosition,
    isLoadingArticle,
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

  const handleWordPressForRenderer = useCallback(
    (word: SentenceWord) => {
      handleWordPress(word);
    },
    [handleWordPress]
  );

  const { getWordsForSentence } = useArticleRenderers(
    { fontScale },
    selectedWordIds,
    sentenceWordsMap,
    handleWordPressForRenderer,
    handleRootPress
  );

  const renderSentenceItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
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

  return (
    <View style={FLEX_ONE_STYLE}>
      {article && sortedSentences ? (
        <ArticleContent
          id={id}
          article={article}
          sortedSentences={sortedSentences}
          renderSentenceItem={renderSentenceItem}
          handleScroll={handleScroll}
          handleViewableItemsChanged={handleViewableItemsChanged}
          colors={colors}
          currentSentenceIndex={currentSentenceIndex}
          totalSentences={sortedSentences.length}
          onSentenceChange={handleSentenceChange}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          scrollViewRef={scrollViewRef as React.RefObject<FlashList<Tables<'article_sentences'>>>}
          isInReadingList={isInReadingList}
          onToggleReadingList={handleToggleReadingListWithFeedback}
          onPlayPress={handlePlayPress}
          isPlaying={isCurrentArticlePlaying}
          onClose={handleClose}
        />
      ) : null}

      {/* Mini-player for article modal */}
      {globalAudioState.currentArticle &&
        (globalAudioState.isPlaying || globalAudioState.audioState === 'loading') &&
        !globalAudioState.showSleepTimerModal && (
          <MiniPlayer
            article={globalAudioState.currentArticle}
            isPlaying={globalAudioState.isPlaying}
            isTimerActive={globalAudioState.isTimerActive}
            position={globalAudioState.position}
            duration={globalAudioState.duration}
            onPlayPause={globalAudioState.onPlayPause}
            onTimerPress={globalAudioState.onTimerPress}
            onExpandPress={globalAudioState.onExpandPress}
            onMiniPlayerPress={globalAudioState.onMiniPlayerPress}
          />
        )}

      <WordTooltip
        visible={!!activeTooltip}
        text={activeTooltip?.word.english}
        arabicWord={activeTooltip?.word.word_form}
        layout={activeTooltip?.layout ?? null}
        onClose={handleCloseTooltip}
        isInStudyList={
          activeTooltip?.word.root_id ? selectedWordIds.has(activeTooltip.word.root_id) : false
        }
        onStudyListToggle={handleStudyListToggle}
        wordRootId={activeTooltip?.word.root_id}
      />
    </View>
  );
};

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDarkMode = useIsDarkMode();
  const colors = useColors();

  return (
    <ToastProvider>
      <View style={[FLEX_ONE_STYLE, { backgroundColor: colors.background }]}>
        <StatusBar
          animated={true}
          style={isDarkMode ? 'light' : 'dark'}
          translucent={true}
          backgroundColor="transparent"
        />
        <ArticleScreenContent id={id ?? ''} />
      </View>
    </ToastProvider>
  );
}
