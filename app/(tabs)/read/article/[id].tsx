import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, View, type LayoutRectangle } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence, WordTooltip } from '@/components/article';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ToastProvider, useToast } from '@/components/providers/ToastProvider';
import { TIMING_CONFIG } from '@/constants/animation';
import { AUDIO_STATES } from '@/constants/audio';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useArticleRenderers } from '@/hooks/articles/useArticleRenderers';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useSentenceScrubber } from '@/hooks/articles/useSentenceScrubber';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
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

// Modal drag indicator component
const ModalDragIndicator = () => {
  const colors = useColors();

  return (
    <View
      style={{
        paddingTop: LAYOUT.SPACING.SMALL, // Fixed small spacing instead of safe area dependent
        paddingBottom: LAYOUT.SPACING.TINY,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: LAYOUT.SPACING.XXXLARGE, // 32px - responsive spacing
          height: LAYOUT.SPACING.TINY, // 4px - responsive spacing
          backgroundColor: colors.modalIndicator,
          borderRadius: LAYOUT.BORDER_RADIUS.PILL,
          opacity: LAYOUT.OPACITY.MEDIUM,
        }}
      />
    </View>
  );
};

// Inner component with toast context access
const ArticleScreenContent = ({ id }: { id: string }) => {
  const { showToast } = useToast();
  const colors = useColors();
  const { user } = useAuth();
  const fontScale = useAppSelectorMemo(state => state.settings.fontScale);

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
    isLoadingReadingList,
    refetchReadingListStatus,
  } = useArticleData(articleId, user?.id);

  // Audio player functionality
  const audioPlayer = useAudioPlayer();
  const { audioState } = audioPlayer;
  const [isPlayNowLoading, setIsPlayNowLoading] = useState(false);
  const [isOptimisticallyPlaying, setIsOptimisticallyPlaying] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{
    word: SentenceWord;
    layout: LayoutRectangle;
  } | null>(null);

  // Article mutations for reading list and word management
  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    refetchStudyWords
  );

  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  // Audio control handlers
  const handlePlayNow = useCallback(async () => {
    if (!article?.audio_url || !articleId) return;

    // Check if currently playing this article - if so, stop it
    if (isOptimisticallyPlaying || audioState === AUDIO_STATES.PLAYING) {
      selectionFeedback();
      setIsOptimisticallyPlaying(false);
      await audioPlayer.actions.stopPlayback();
      return;
    }

    try {
      // Optimistic UI update - immediately show as playing for smooth transition
      setIsOptimisticallyPlaying(true);
      selectionFeedback();

      // Start loading state after optimistic update
      setIsPlayNowLoading(true);

      // Generate enhanced audio track for this article
      const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId);
      if (track) {
        const success = await audioPlayer.actions.startEnhancedPlayback([track], 0);
        if (!success) {
          handleError(new Error(STRINGS.FAILED_TO_START_AUDIO_PLAYBACK), {
            showToast: false,
            captureSentry: true,
            analyticsEventName: 'Audio Playback Start Failed',
            analyticsProperties: { articleId, feature: 'audio_playback' },
          });
          // Revert optimistic state on failure
          setIsOptimisticallyPlaying(false);
        }
      } else {
        handleError(new Error(STRINGS.FAILED_TO_GENERATE_AUDIO_TRACK), {
          showToast: false,
          captureSentry: true,
          analyticsEventName: 'Audio Track Generation Failed',
          analyticsProperties: { articleId, feature: 'audio_generation' },
        });
        // Revert optimistic state on failure
        setIsOptimisticallyPlaying(false);
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), {
        showToast: false,
        captureSentry: true,
        analyticsEventName: 'Article Playback Start Error',
        analyticsProperties: { articleId, feature: 'audio_playback_start' },
      });
      // Revert optimistic state on error
      setIsOptimisticallyPlaying(false);
    } finally {
      setIsPlayNowLoading(false);
    }
  }, [article?.audio_url, articleId, audioPlayer.actions, isOptimisticallyPlaying, audioState]);

  const handleToggleReadingListWithFeedback = useCallback(async () => {
    if (!articleId) return;

    selectionFeedback();

    // Store previous state for toast message
    const wasInReadingList = isInReadingList;

    await handleToggleReadingList(articleId, isInReadingList);

    // Show appropriate toast message
    const toastMessage = wasInReadingList
      ? STRINGS.REMOVED_FROM_LISTENING_LIST
      : STRINGS.ADDED_TO_LISTENING_LIST;
    showToast(toastMessage);
  }, [articleId, isInReadingList, handleToggleReadingList, showToast]);

  // Reset optimistic state when audio actually stops
  useEffect(() => {
    if (audioState !== AUDIO_STATES.PLAYING && isOptimisticallyPlaying) {
      setIsOptimisticallyPlaying(false);
    }
  }, [audioState, isOptimisticallyPlaying]);

  // Check if currently playing this article's audio (including optimistic state)
  const isPlayingThisArticle = useMemo(() => {
    return isOptimisticallyPlaying || (audioState === AUDIO_STATES.PLAYING && !!article?.audio_url);
  }, [isOptimisticallyPlaying, audioState, article?.audio_url]);

  // Button text and styling
  const playButtonText = useMemo(() => {
    return isPlayingThisArticle ? STRINGS.STOP : STRINGS.PLAY_NOW;
  }, [isPlayingThisArticle]);

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

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        refetchStudyWords?.();
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

  const handleWordPress = useCallback(
    (word: SentenceWord, layout?: LayoutRectangle) => {
      // Handle tooltip visibility only if layout is provided
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
    <ThemedView style={FLEX_ONE_STYLE}>
      <StatusBar style={useIsDarkMode() ? 'light' : 'dark'} />
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
          scrollViewRef={scrollViewRef}
          isInReadingList={isInReadingList}
          isLoadingReadingList={isLoadingReadingList}
          onPlayNow={handlePlayNow}
          onToggleReadingList={handleToggleReadingListWithFeedback}
          isPlayingAudio={isPlayingThisArticle}
          isLoadingAudio={isPlayNowLoading}
          playButtonText={playButtonText}
        />
      ) : null}
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
    </ThemedView>
  );
};

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDarkMode = useIsDarkMode();

  return (
    <ToastProvider>
      <ThemedView style={FLEX_ONE_STYLE} useSafeArea={false}>
        <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />
        <ModalDragIndicator />
        <ArticleScreenContent id={id ?? ''} />
      </ThemedView>
    </ToastProvider>
  );
}
