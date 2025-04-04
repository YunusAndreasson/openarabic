import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { analytics } from '@/services/analytics';

// Components
import { ThemedView } from '@/components/ThemedView';
import { ArabicWord } from '@/components/article/ArabicWord';
import { LoadingScreen } from '@/components/Loader';
import { ArticleSentence } from '@/components/article';
import ThemedCard from '@/components/ThemedCard';
import { ArticleButtons } from '@/components/article/ArticleButtons';
import { ArticleContent } from '@/components/article/ArticleContent';
import { ArticleNotFound } from '@/components/NotFound';

// Hooks
import { useColors } from '@/hooks/useColors';
import { useAppSelector } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { useScreenAnimations } from '@/hooks/animations';
import { useArticleData } from '@/hooks/useArticleData';
import { useArticleMutations } from '@/hooks/useArticleMutations';
import { useArticleRenderers } from '@/hooks/useArticleRenderers';
import { useNavigationWithDebounce } from '@/hooks';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { lightFeedback } from '@/utils/haptics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Tables } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';
import { Article } from '../../types/articles.types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 0, // Remove the top padding since we're centering
  },
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();

  // Track previous audio state to detect transitions

  // Scroll position tracking
  const prevScrollYValue = useRef(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Play/Stop button state
  const [isPlaying, setIsPlaying] = useState(false);

  // FORCE a default bookmark icon to ensure it's always visible
  const [initialBookmarkIcon, setInitialBookmarkIcon] = useState<'bookmark-outline' | 'bookmark'>(
    'bookmark-outline'
  );

  // Navigation hook
  const { navigateTo } = useNavigationWithDebounce();

  // Audio player hook
  const { loadAndPlayAudio, stopPlayback, audioState } = useAudioPlayer();

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Stabilize audio state changes
  const stableAudioState = useMemo(() => {
    // When audio finishes, it might rapidly transition through states
    // We want to stabilize this by treating certain state combinations as "stopped"
    if (audioState === 'idle' || audioState === 'error') {
      return 'stopped';
    } else if (audioState === 'playing') {
      return 'playing';
    } else {
      return 'stopped';
    }
  }, [audioState]);

  // Update isPlaying state when stable audio state changes
  useEffect(() => {
    setIsPlaying(stableAudioState === 'playing');
  }, [stableAudioState]);

  // Pre-fetch study words if user is logged in with optimized caching
  useEffect(() => {
    if (user?.id) {
      const studyWordsQuery = queryClient.getQueryData(['studyWords', user.id]);
      if (!studyWordsQuery) {
        queryClient.prefetchQuery({
          queryKey: ['studyWords', user.id],
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id),
          staleTime: 300000, // Cache for 5 minutes
          gcTime: 600000, // Keep in garbage collection for 10 minutes
          retry: 2,
        });
      }
    }
  }, [user?.id, queryClient]);

  // Extract article data hook before using any results
  const {
    article,
    isLoadingArticle,
    isInReadingList,
    refetchReadingListStatus,
    isLoadingReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    otherArticles,
    otherCategoryArticles,
  } = useArticleData(articleId, user?.id);

  // Track article view when article data loads
  useEffect(() => {
    if (article && !isLoadingArticle && user) {
      analytics.trackViewArticle(article.id, {
        title: article.title,
        category: article.category?.name,
        wordCount:
          article.article_sentences?.reduce(
            (total, sentence) => total + (sentence.sentence_words?.length || 0),
            0
          ) || 0,
        sentenceCount: article.article_sentences?.length || 0,
      });
    }
  }, [article, isLoadingArticle, user]);

  // Track reading list changes
  useEffect(() => {
    if (article && user && !isLoadingReadingList) {
      analytics.trackToggleReadingList(article.id, isInReadingList);
    }
  }, [article, isInReadingList, isLoadingReadingList, user]);

  // Use animation hook for content and button visibility on scroll
  const {
    footerStyle,
    backButtonStyle,
    bookmarkButtonStyle,
    playButtonStyle,
    startAllAnimations,
    handleScroll: handleAnimationScroll,
  } = useScreenAnimations(true);

  // Track article completion and handle animations on scroll
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 20;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isCloseToBottom && article && user) {
        analytics.trackCompleteArticle(article.id, {
          wordsAdded: selectedWordIds.size,
        });
      }

      // Handle scroll animations
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const isScrollingUp = currentScrollY < prevScrollYValue.current;
      const isAtTop = currentScrollY <= 0;
      const shouldBeVisible = isScrollingUp || isAtTop;

      if (isHeaderVisible !== shouldBeVisible) {
        setIsHeaderVisible(shouldBeVisible);
      }

      if (event.nativeEvent.contentOffset.y <= 0) {
        prevScrollYValue.current = 0;
      }
      handleAnimationScroll(event, prevScrollYValue);
    },
    [article, user, selectedWordIds, handleAnimationScroll, isHeaderVisible, prevScrollYValue]
  );

  // Update bookmark icon when reading list status changes
  useEffect(() => {
    if (!isLoadingReadingList) {
      setInitialBookmarkIcon(isInReadingList ? 'bookmark' : 'bookmark-outline');
    }
  }, [isLoadingReadingList, isInReadingList]);

  // Check if all data is loaded with optimized loading states
  const isLoading = useMemo(() => {
    // Consider data ready if we have article data in cache
    const articleQuery = queryClient.getQueryData(['article', articleId]);
    if (articleQuery) return false;

    return (
      isLoadingArticle ||
      isLoadingReadingList ||
      !article?.article_sentences ||
      !sentenceWordsMap ||
      (article.article_sentences.length > 0 && !sortedSentences?.length)
    );
  }, [
    isLoadingArticle,
    isLoadingReadingList,
    article,
    sentenceWordsMap,
    sortedSentences,
    articleId,
    queryClient,
  ]);

  // Start content animations when mounted
  useEffect(() => {
    startAllAnimations();
  }, [startAllAnimations]);

  // Handle article data hook callbacks
  const { handleToggleReadingList, handleWordPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus
  );

  // Use the article renderers hook
  const { handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    colors,
    selectedWordIds,
    sentenceWordsMap || new Map(),
    (word: Tables<'sentence_words'>) => handleWordPress(word.id)
  );

  // Handle back button press with optimized cleanup
  const handleBackPress = useCallback(() => {
    if (isPlaying) {
      // Run audio cleanup in parallel
      stopPlayback().catch(error => {
        handleError(error);
      });
    }
    navigateTo({ pathname: '/' }); // Navigate to root
  }, [navigateTo, isPlaying, stopPlayback]);

  // Handle bookmark toggle with optimistic updates
  const handleBookmarkPress = useCallback(() => {
    // Add this check: If no user, do nothing
    if (!user) {
      return;
    }

    if (articleId) {
      lightFeedback();
      setInitialBookmarkIcon(isInReadingList ? 'bookmark-outline' : 'bookmark');
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList, user]);

  // Handle play button press
  const handlePlayPress = useCallback(async () => {
    if (isPlaying) {
      lightFeedback();
      setIsPlaying(false);
      await stopPlayback();
    } else {
      const audioUrl = article?.audio_url ?? null;
      if (!audioUrl) return;

      lightFeedback();
      setIsPlaying(true);
      const success = await loadAndPlayAudio(audioUrl);

      if (!success) {
        setIsPlaying(false);
        lightFeedback();
      }
    }
  }, [isPlaying, article, loadAndPlayAudio, stopPlayback]);

  // Component renderers
  const renderWord = useCallback(
    (
      word: Tables<'sentence_words'> & {
        root: Tables<'roots'> | null;
        word_type: Tables<'word_types'> | null;
      }
    ) => {
      return (
        <ArabicWord
          key={word.id}
          word={word}
          onPress={word => handleWordPress(word.id)}
          settings={{
            showEnglish: false,
            fontScale: settings.fontScale,
            showTransliteration: false,
            showWordType: false,
          }}
        />
      );
    },
    [handleWordPress, settings]
  );

  // Render article list item with optimized settings
  const renderSentenceItem = useCallback(
    ({ item: sentence }: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(sentence.id);
      return (
        <ArticleSentence
          key={sentence.id}
          sentence={sentence}
          words={words}
          renderWord={renderWord}
          settings={settings}
          colors={colors}
          containerStyle={{ backgroundColor: colors.transparent }}
        />
      );
    },
    [getWordsForSentence, renderWord, settings, colors]
  );

  // Render article card with memoization
  const renderArticleCard = useCallback(
    (articleData: Article) => (
      <ThemedCard
        key={articleData.id}
        variant="compact"
        article={articleData}
        onPress={() => handleArticlePress(articleData.id, true)}
      />
    ),
    [handleArticlePress]
  );

  // Main render - loading state
  if (isLoading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        useSafeArea={false}
      >
        <StatusBar
          style={isDarkMode ? 'light' : 'dark'}
          translucent={true}
          animated={true}
          hidden={false}
        />
        <View style={styles.loadingContainer}>
          <LoadingScreen />
        </View>

        <ArticleButtons
          backButtonStyle={backButtonStyle}
          bookmarkButtonStyle={bookmarkButtonStyle}
          playButtonStyle={playButtonStyle}
          onBackPress={handleBackPress}
          onBookmarkPress={handleBookmarkPress}
          onPlayPress={handlePlayPress}
          isInReadingList={isInReadingList}
          isBookmarked={isInReadingList}
          initialBookmarkIcon={initialBookmarkIcon}
          isPlaying={isPlaying}
          colors={colors}
          isDarkMode={isDarkMode}
          user={user}
        />
      </ThemedView>
    );
  }

  // Article not found state
  if (!article) {
    return (
      <ThemedView style={styles.container} useSafeArea={false}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} animated={true} />

        <ArticleNotFound />

        <ArticleButtons
          backButtonStyle={backButtonStyle}
          bookmarkButtonStyle={bookmarkButtonStyle}
          playButtonStyle={playButtonStyle}
          onBackPress={handleBackPress}
          onBookmarkPress={handleBookmarkPress}
          onPlayPress={handlePlayPress}
          isInReadingList={isInReadingList}
          isBookmarked={isInReadingList}
          initialBookmarkIcon={initialBookmarkIcon}
          isPlaying={isPlaying}
          colors={colors}
          isDarkMode={isDarkMode}
          user={user}
        />
      </ThemedView>
    );
  }

  // Main article view
  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        translucent={true}
        animated={true}
        hidden={!isHeaderVisible}
      />

      <ArticleButtons
        backButtonStyle={backButtonStyle}
        bookmarkButtonStyle={bookmarkButtonStyle}
        playButtonStyle={playButtonStyle}
        onBackPress={handleBackPress}
        onBookmarkPress={handleBookmarkPress}
        onPlayPress={handlePlayPress}
        isInReadingList={isInReadingList}
        isBookmarked={isInReadingList}
        initialBookmarkIcon={initialBookmarkIcon}
        isPlaying={isPlaying}
        colors={colors}
        isDarkMode={isDarkMode}
        user={user}
      />

      {/* Article content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        {sortedSentences && sortedSentences.length > 0 && (
          <ArticleContent
            id={id as string}
            article={article}
            sortedSentences={sortedSentences}
            renderSentenceItem={renderSentenceItem}
            handleScroll={handleScroll}
            colors={colors}
            isDarkMode={isDarkMode}
            footerStyle={footerStyle}
            otherArticles={otherArticles}
            otherCategoryArticles={otherCategoryArticles}
            renderArticleCard={renderArticleCard}
          />
        )}
      </View>
    </ThemedView>
  );
}
