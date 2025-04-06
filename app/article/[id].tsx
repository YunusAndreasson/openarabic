import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { LoadingScreen } from '@/components/Loader';
import { ArticleNotFound } from '@/components/NotFound';
import ThemedCard from '@/components/ThemedCard';
import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article';
import { ArabicWord } from '@/components/article/ArabicWord';
import { ArticleButtons } from '@/components/article/ArticleButtons';
import { ArticleContent, type ArticleContentRef } from '@/components/article/ArticleContent';
import { useNavigationWithDebounce } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import { useArticleData } from '@/hooks/useArticleData';
import { useArticleMutations } from '@/hooks/useArticleMutations';
import { useArticleRenderers } from '@/hooks/useArticleRenderers';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useSentenceAudioPlayer, type WordTiming } from '@/hooks/useSentenceAudioPlayer';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { useAppSelector } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

import type { Article } from '../../types/articles.types';

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

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();
  const router = useRouter();
  const articleContentRef = useRef<ArticleContentRef>(null);

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
  useNavigationWithDebounce();

  // New sentence audio player hook
  const sentenceAudioPlayer = useSentenceAudioPlayer();

  // Audio playback states for sentences
  const [currentPlayingSentenceId, setCurrentPlayingSentenceId] = useState<number | null>(null);

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Stabilize audio state changes
  const stableAudioState = useMemo(() => {
    if (sentenceAudioPlayer.isPlaying) {
      return 'playing';
    } else if (sentenceAudioPlayer.audioState === 'loading') {
      return 'loading';
    } else {
      return 'stopped';
    }
  }, [sentenceAudioPlayer.isPlaying, sentenceAudioPlayer.audioState]);

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
        ...(article.title && { title: article.title }),
        ...(article.category?.name && { category: article.category.name }),
        ...(article.article_sentences && {
          wordCount: article.article_sentences.reduce(
            (total, sentence) => total + (sentence.sentence_words?.length || 0),
            0
          ),
          sentenceCount: article.article_sentences.length,
        }),
      });
    }
  }, [article, isLoadingArticle, user]);

  // Track reading list changes
  useEffect(() => {
    if (article && user && !isLoadingReadingList) {
      analytics.trackToggleReadingList(article.id, isInReadingList);
    }
  }, [article, isInReadingList, isLoadingReadingList, user]);

  // Use animation hooks for screen and buttons
  const { fadeInStyle, triggerAnimations } = useScreenAnimation(true);
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isHeaderVisible ? 1 : 0, { duration: 200 }),
  }));

  // Use the same animated style for all buttons since they share the same visibility
  const backButtonStyle = buttonStyle;
  const bookmarkButtonStyle = buttonStyle;
  const playButtonStyle = buttonStyle;

  // Prepare audio data for sentence-by-sentence playback
  const sentenceAudioData = useMemo(() => {
    if (!sortedSentences || !sentenceWordsMap) {
      return [];
    }

    const audioData = sortedSentences
      .filter(sentence => {
        // Only include sentences with valid audio URLs
        const audioUrl = sentence.audio_url;
        const isValid =
          audioUrl &&
          audioUrl.trim().length > 0 &&
          (audioUrl.startsWith('http://') ||
            audioUrl.startsWith('https://') ||
            audioUrl.startsWith('file://'));

        return isValid;
      })
      .map(sentence => {
        const sentenceId = sentence.id;
        const words = sentenceWordsMap.get(sentenceId) || [];

        // Create word timings from the words that have audio_start and audio_end
        const wordTimings: WordTiming[] = words
          .filter(word => {
            const start = parseFloat(word.audio_start || '');
            const end = parseFloat(word.audio_end || '');
            const isValid = !isNaN(start) && !isNaN(end) && start < end;
            return isValid;
          })
          .map(word => ({
            wordId: word.id,
            startTime: parseFloat(word.audio_start || '0') * 1000, // Convert to milliseconds
            endTime: parseFloat(word.audio_end || '0') * 1000, // Convert to milliseconds
          }));

        return {
          sentenceId,
          audioUrl: sentence.audio_url || '',
          wordTimings,
        };
      });

    return audioData;
  }, [sortedSentences, sentenceWordsMap]);

  // Find a word by ID from all sentences
  const findWordById = useCallback(
    (wordId: number): Tables<'sentence_words'> | undefined => {
      if (!sentenceWordsMap) return undefined;

      // Iterate through all sentences to find the word
      for (const words of sentenceWordsMap.values()) {
        const word = words.find(w => w.id === wordId);
        if (word) return word;
      }

      return undefined;
    },
    [sentenceWordsMap]
  );

  // Auto-scroll to the currently highlighted word
  useEffect(() => {
    const currentWordId = sentenceAudioPlayer.currentWordId;
    if (!currentWordId || !articleContentRef.current) {
      return;
    }

    // Find the sentence that contains this word
    const word = findWordById(currentWordId);
    if (!word) {
      return;
    }

    // Set the current playing sentence ID
    setCurrentPlayingSentenceId(word.sentence_id);

    // Use the ArticleContent ref to scroll to the sentence
    articleContentRef.current.scrollToSentence(word.sentence_id);
  }, [sentenceAudioPlayer.currentWordId, findWordById]);

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

      prevScrollYValue.current = currentScrollY;
    },
    [article, user, selectedWordIds, isHeaderVisible]
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
    triggerAnimations();
  }, [triggerAnimations]);

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
      sentenceAudioPlayer.stopPlayback().catch(error => {
        handleError(error);
      });
    }
    router.back(); // Use router.back() for proper back navigation
  }, [isPlaying, router, sentenceAudioPlayer]);

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

  // Handle play button press for article-level play/pause
  const handlePlayPress = useCallback(async () => {
    if (isPlaying) {
      lightFeedback();
      setIsPlaying(false);
      await sentenceAudioPlayer.stopPlayback();
      setCurrentPlayingSentenceId(null);
    } else {
      lightFeedback();

      // Start playing from the beginning
      const success = await sentenceAudioPlayer.startPlayback(sentenceAudioData);

      if (success) {
        setIsPlaying(true);
      } else {
        lightFeedback();
      }
    }
  }, [isPlaying, sentenceAudioPlayer, sentenceAudioData]);

  // Component renderers
  const renderWord = useCallback(
    (
      word: Tables<'sentence_words'> & {
        root: Tables<'roots'> | null;
        word_type: Tables<'word_types'> | null;
      },
      isAudioHighlighted = false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wordRef?: any
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
          isAudioHighlighted={isAudioHighlighted}
          wordRef={wordRef}
        />
      );
    },
    [handleWordPress, settings]
  );

  // Render article list item with optimized settings
  const renderSentenceItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item: sentence }: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(sentence.id);
      return (
        <ArticleSentence
          key={sentence.id}
          sentence={{
            id: sentence.id,
            english: sentence.english,
            audio_url: sentence.audio_url || undefined,
          }}
          words={words}
          renderWord={renderWord}
          settings={settings}
          colors={colors}
          containerStyle={{ backgroundColor: colors.transparent }}
          currentPlayingSentenceId={currentPlayingSentenceId}
          currentPlayingWordId={sentenceAudioPlayer.currentWordId}
        />
      );
    },
    [
      getWordsForSentence,
      renderWord,
      settings,
      colors,
      currentPlayingSentenceId,
      sentenceAudioPlayer.currentWordId,
    ]
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
        initialBookmarkIcon={initialBookmarkIcon}
        isPlaying={isPlaying}
        colors={colors}
        user={user}
        isDarkMode={isDarkMode}
      />

      {/* Article content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <ArticleContent
            ref={articleContentRef}
            id={id}
            article={article}
            sortedSentences={sortedSentences}
            renderSentenceItem={renderSentenceItem}
            handleScroll={handleScroll}
            colors={colors}
            footerStyle={fadeInStyle as AnimatedStyleProp<ViewStyle>}
            otherArticles={otherArticles}
            otherCategoryArticles={otherCategoryArticles}
            renderArticleCard={renderArticleCard}
            currentPlayingSentenceId={currentPlayingSentenceId}
          />
        ) : null}
      </View>
    </ThemedView>
  );
}
