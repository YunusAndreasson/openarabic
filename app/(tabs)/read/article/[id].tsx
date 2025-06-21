import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article';
import { ArabicWord } from '@/components/article/ArabicWord';
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
  const { fadeIn, animatedStyle } = useOpacityAnimation({
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
          handleError(new Error('Failed to start enhanced playback'), {
            showToast: false,
            captureSentry: true,
            analyticsEventName: 'Audio Playback Start Failed',
            analyticsProperties: { articleId, feature: 'audio_playback' },
          });
          // Revert optimistic state on failure
          setIsOptimisticallyPlaying(false);
        }
      } else {
        handleError(new Error('Failed to generate audio track'), {
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

  const handleWordPressWithFeedback = useCallback(
    (word: SentenceWord) => {
      if (word.root_id) {
        // Always provide haptic feedback for word interactions
        selectionFeedback();
        handleRootPress(word.root_id);
      }
    },
    [handleRootPress]
  );

  const { getWordsForSentence } = useArticleRenderers(
    { fontScale },
    selectedWordIds,
    sentenceWordsMap,
    handleWordPressWithFeedback,
    handleRootPress
  );

  const wordSettings = useMemo(() => ({ fontScale }), [fontScale]);

  const renderWord = useCallback(
    (word: SentenceWord) => {
      // Check if this word is due for review
      const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;

      return (
        <ArabicWord
          key={word.id}
          isDueWord={isDueWord}
          word={word}
          settings={wordSettings}
          onPress={handleWordPressWithFeedback}
        />
      );
    },
    [dueWordRootIds, wordSettings, handleWordPressWithFeedback]
  );

  const sentenceSettings = useMemo(() => ({ showEnglish: true, fontScale }), [fontScale]);

  const sentenceContainerStyle = useMemo(
    () => ({
      backgroundColor: colors.transparent,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [colors.transparent]
  );

  const renderSentenceItem = useCallback(
    (props: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(props.item.id);

      return (
        <ArticleSentence
          key={props.item.id}
          colors={colors}
          containerStyle={sentenceContainerStyle}
          renderWord={renderWord}
          settings={sentenceSettings}
          words={words}
          sentence={{
            id: props.item.id,
            english: props.item.english,
            arabic: props.item.arabic,
            audio_url: props.item.audio_url,
          }}
        />
      );
    },
    [getWordsForSentence, renderWord, colors, sentenceSettings, sentenceContainerStyle]
  );

  const containerStyle = FLEX_ONE_STYLE;
  const contentStyle = useMemo(() => [FLEX_ONE_STYLE, animatedStyle as ViewStyle], [animatedStyle]);

  return (
    <View style={containerStyle}>
      {article && sortedSentences && sortedSentences.length > 0 ? (
        <Animated.View style={contentStyle}>
          <ArticleContent
            article={article}
            colors={colors}
            handleScroll={handleScroll}
            handleViewableItemsChanged={handleViewableItemsChanged}
            id={id}
            renderSentenceItem={renderSentenceItem}
            sortedSentences={sortedSentences}
            currentSentenceIndex={currentSentenceIndex}
            totalSentences={sortedSentences.length}
            scrollViewRef={scrollViewRef}
            onSentenceChange={handleSentenceChange}
            onScrubStart={handleScrubStart}
            onScrubEnd={handleScrubEnd}
            isInReadingList={isInReadingList}
            isLoadingReadingList={isLoadingReadingList}
            onPlayNow={handlePlayNow}
            onToggleReadingList={handleToggleReadingListWithFeedback}
            isPlayingAudio={isPlayingThisArticle}
            isLoadingAudio={isPlayNowLoading}
            playButtonText={playButtonText}
          />
        </Animated.View>
      ) : null}
    </View>
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
