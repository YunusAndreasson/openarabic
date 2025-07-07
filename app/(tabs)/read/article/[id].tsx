import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, type LayoutRectangle, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ArticleSentence, WordTooltip } from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { MiniPlayer } from '@/components/audio';
import { ToastProvider, useToast } from '@/components/providers';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
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

  // Local state for resume toast positioned near scrubber
  const [resumeToast, setResumeToast] = useState<{
    visible: boolean;
    progress: number;
  }>({ visible: false, progress: 0 });

  // Audio player for single article playback
  const audioPlayer = useSimpleAudioPlayer();

  const { handleScroll } = useHeaderVisibility();

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

  // Check if current article is being played
  const isCurrentArticlePlaying = useMemo(() => {
    const currentArticleId = audioPlayer.currentTrack?.articleId
      ? parseInt(audioPlayer.currentTrack.articleId.toString(), 10)
      : null;
    return currentArticleId === articleId;
  }, [audioPlayer.isPlaying, audioPlayer.currentTrack?.articleId, articleId]);

  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

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

    // Show toast notification for user feedback
    showToast(isInReadingList ? 'Removed from playlist' : 'Added to playlist', 3000, 'success');
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  const handleClose = useCallback(() => {
    selectionFeedback();
    router.back();
  }, []);

  const globalAudioState = useGlobalAudioState();

  // Handle audio playback for single article
  const handlePlayPress = useCallback(async () => {
    if (!articleId) return;

    try {
      selectionFeedback();

      if (isCurrentArticlePlaying) {
        // Stop current playback
        await audioPlayer.stop();
        return;
      }

      // Generate and play single track for this article
      // Mini-player will appear automatically when audio starts
      const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId);
      if (track) {
        const success = await audioPlayer.play(track);
        // Explicitly close sleep timer to ensure mini-player is shown
        if (success) {
          globalAudioState.onSleepTimerClose();
        }
        // Removed automatic navigation - let mini-player handle expand action
        if (!success) {
          // Could add error handling here if needed
        }
      }
    } catch (error) {
      handleError(error as Error);
    }
  }, [articleId, isCurrentArticlePlaying, audioPlayer, globalAudioState]);

  // Initialize sentence scrubber
  const {
    currentSentenceIndex,
    scrollViewRef,
    handleViewableItemsChanged,
    handleSentenceChange,
    handleScrubStart,
    handleScrubEnd,
  } = useSentenceScrubber({
    sortedSentences: sortedSentences || [],
    dueWordRootIds,
    sentenceWordsMap,
  });

  // Track reading progress
  const {
    progress: _progress,
    updateProgress: _updateProgress,
    lastSentenceRead,
    isLoading: isProgressLoading,
  } = useReadingProgress({
    articleId: articleId ?? 0,
    totalSentences: sortedSentences?.length ?? 0,
    currentSentenceIndex,
    isActive: !!article && !isLoadingArticle, // Only track when article is loaded and being read
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        void refetchStudyWords?.();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user?.id, refetchStudyWords]);

  // Trigger fade-in when article content is ready
  useEffect(() => {
    if (article && sortedSentences && sortedSentences.length > 0 && !isLoadingArticle) {
      fadeIn();
    }
  }, [article, sortedSentences, isLoadingArticle, fadeIn]);

  // Jump to last read sentence when article loads (if meaningful progress exists)
  useEffect(() => {
    if (
      article &&
      sortedSentences &&
      sortedSentences.length > 0 &&
      !isLoadingArticle &&
      !isProgressLoading &&
      lastSentenceRead > 0
    ) {
      // Only jump if there's meaningful progress (more than 10% or at least 3 sentences)
      const meaningfulProgress =
        lastSentenceRead >= 3 || lastSentenceRead / sortedSentences.length >= 0.1;

      if (meaningfulProgress) {
        console.log(
          `🚀 Jumping to last read sentence: ${lastSentenceRead}/${sortedSentences.length}`
        );

        // Calculate progress percentage for toast message
        const progressPercentage = Math.round((lastSentenceRead / sortedSentences.length) * 100);

        // Small delay to ensure the list is fully rendered before jumping
        setTimeout(() => {
          handleSentenceChange(lastSentenceRead);

          // Add haptic feedback for resume action
          selectionFeedback();

          // Show resume toast near scrubber
          setResumeToast({ visible: true, progress: progressPercentage });

          // Auto-hide after 3 seconds
          setTimeout(() => {
            setResumeToast(prev => ({ ...prev, visible: false }));
          }, 3000);
        }, 500);
      }
    }
  }, [
    article,
    sortedSentences,
    isLoadingArticle,
    isProgressLoading,
    lastSentenceRead,
    handleSentenceChange,
  ]);

  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      // Handle tooltip visibility only if layout is provided
      if (layout && layout.width > 0) {
        if (activeTooltip?.word.id === word.id) {
          // If tapping the same word, close the tooltip
          setActiveTooltip(null);
        } else {
          // If tapping a different word (or no tooltip is open), open the new tooltip
          setActiveTooltip({ word, layout });
        }
      }
    },
    [activeTooltip]
  );

  // Separate handler for study list toggle from tooltip
  const handleStudyListToggle = useCallback(() => {
    if (activeTooltip?.word.root_id) {
      selectionFeedback();
      handleRootPress(activeTooltip.word.root_id);
    }
  }, [activeTooltip, handleRootPress]);

  const handleCloseTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  // Create a wrapper for the word press handler that matches useArticleRenderers signature
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
        // Return an empty view instead of null to satisfy the ReactElement requirement
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
      <StatusBar
        animated={true}
        style={useIsDarkMode() ? 'light' : 'dark'}
        translucent={true}
        backgroundColor="transparent"
      />
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
          scrollViewRef={scrollViewRef as React.RefObject<any>}
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

      {/* Resume toast positioned near scrubber */}
      {resumeToast.visible && (
        <View
          style={{
            position: 'absolute',
            bottom: LAYOUT.SPACING.XLARGE * 3, // Position above scrubber
            left: LAYOUT.SPACING.XLARGE,
            right: LAYOUT.SPACING.XLARGE,
            alignItems: 'center',
            zIndex: LAYOUT.Z_INDEX.POPUP,
          }}
        >
          <View
            style={{
              backgroundColor: colors.success || colors.tint,
              paddingHorizontal: LAYOUT.SPACING.MEDIUM,
              paddingVertical: LAYOUT.SPACING.SMALL,
              borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
              ...LAYOUT.ELEVATION.SMALL,
            }}
          >
            <ThemedText
              style={{
                color: colors.white,
                fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Resumed at {resumeToast.progress}%
            </ThemedText>
          </View>
        </View>
      )}
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
