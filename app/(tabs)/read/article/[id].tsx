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

// Static resume toast styles
const RESUME_TOAST_STYLES = {
  container: {
    position: 'absolute' as const,
    bottom: LAYOUT.SPACING.XLARGE * 3,
    left: LAYOUT.SPACING.XLARGE,
    right: LAYOUT.SPACING.XLARGE,
    alignItems: 'center' as const,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  toast: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    ...LAYOUT.ELEVATION.SMALL,
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
} as const;

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
    return currentArticleId === articleId;
  }, [audioPlayer.currentTrack?.articleId, articleId]);

  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Handle scroll to close tooltip and hide header
  const handleScroll = useCallback(
    (event: any) => {
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
    selectionFeedback();
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
  const { lastSentenceRead } = useReadingProgress({
    articleId: articleId ?? 0,
    totalSentences: sortedSentences?.length ?? 0,
    currentSentenceIndex,
    isActive: !!article && !isLoadingArticle,
  });

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

  // Show toast when resuming reading progress
  useEffect(() => {
    if (
      lastSentenceRead !== null &&
      lastSentenceRead > 0 &&
      sortedSentences &&
      sortedSentences.length > 0
    ) {
      const progressPercent = Math.round((lastSentenceRead / sortedSentences.length) * 100);

      selectionFeedback();
      setResumeToast({ visible: true, progress: progressPercent });

      const timer = setTimeout(() => {
        setResumeToast({ visible: false, progress: 0 });
      }, 3000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [lastSentenceRead, sortedSentences]);

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

  const resumeToastStyle = useMemo(
    () => ({
      ...RESUME_TOAST_STYLES.toast,
      backgroundColor: colors.success || colors.tint,
    }),
    [colors.success, colors.tint]
  );

  const resumeTextStyle = useMemo(
    () => ({
      ...RESUME_TOAST_STYLES.text,
      color: colors.white,
    }),
    [colors.white]
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
        <View style={RESUME_TOAST_STYLES.container}>
          <View style={resumeToastStyle}>
            <ThemedText style={resumeTextStyle}>Resumed at {resumeToast.progress}%</ThemedText>
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
