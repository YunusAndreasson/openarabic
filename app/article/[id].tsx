import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  StyleSheet,
  View,
  FlatList,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';

// Components
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ArabicWord } from '@/components/ArabicWord';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import { LoadingScreen } from '@/components/Loader';
import { ArticleSentence } from '@/components/ArticleSentence';
import ArticleHeader from '@/components/ArticleHeader';
import FloatingButton from '@/components/FloatingButton';
import RelatedArticlesFooter from '@/components/RelatedArticlesFooter';

// Hooks
import { useColors } from '@/hooks/useColors';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import {
  useFadeInAnimation,
  useFloatingButtonAnimation,
  useOpacityAnimation,
} from '@/hooks/animations';
import { useArticleData } from '@/hooks/useArticleData';
import { useArticleMutations } from '@/hooks/useArticleMutations';
import { useArticleRenderers } from '@/hooks/useArticleRenderers';
import { useNavigationWithDebounce } from '@/hooks';
import { useAudioPlayer, AUDIO_STATES } from '@/hooks/useAudioPlayer';
import { useLoadingState } from '@/hooks/useLoadingState';

// Store
import {
  addToReadingList,
  incrementReadCount,
  updateLastOpenedArticle,
} from '@/store/readingListSlice';

// Constants
import { LAYOUT } from '@/constants/layout';

// Utils
import { mediumFeedback, successFeedback, lightFeedback } from '@/utils/haptics';

// Types
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sentenceList: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
  },
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Tables<'article_sentences'>>>(null);
  const queryClient = useQueryClient();

  // Track component mounted state
  const isMountedRef = useRef(true);

  // Track previous audio state to detect transitions
  const prevAudioStateRef = useRef(AUDIO_STATES.IDLE);

  // Animation state
  const [isButtonsVisible, setIsButtonsVisible] = useState(true);
  const prevScrollYValue = useRef(0);

  // Play/Stop button state
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio player hook
  const { audioState, loadAndPlayAudio, stopPlayback } = useAudioPlayer();

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Check if data is already in cache to optimize loading time
  const isDataPrefetched = useMemo(() => {
    if (!articleId) return false;
    // Use a different approach to avoid type errors
    const cachedData = queryClient.getQueryData(['article', articleId]);
    return cachedData !== undefined && cachedData !== null;
  }, [articleId, queryClient]);

  // Use dynamic loading state with optimized timeout
  const {
    isLoading: isLoadingState,
    startLoading,
    stopLoading,
    updateMinLoadingTime,
  } = useLoadingState(isDataPrefetched ? 100 : 500, true);

  // Update minimum loading time when prefetched status changes
  useEffect(() => {
    // Make sure the function exists before calling it (defensive coding)
    if (updateMinLoadingTime) {
      updateMinLoadingTime(isDataPrefetched ? 100 : 500);
    }
  }, [isDataPrefetched, updateMinLoadingTime]);

  // Use the custom article data hook with optimized loading behavior
  const {
    article,
    isLoadingArticle,
    isInReadingList,
    refetchReadingListStatus,
    studyWords,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    otherArticles,
    otherCategoryArticles,
  } = useArticleData(
    articleId,
    user?.id,
    !!isDataPrefetched // Make sure we pass a boolean
  );

  // Use the custom article mutations hook
  const { handleToggleReadingList, handleWordPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus
  );

  // Use the custom article renderers hook
  const { prepareWord, handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    colors,
    selectedWordIds,
    sentenceWordsMap,
    (word: Tables<'sentence_words'>) => handleWordPress(word.id)
  );

  // Animation hooks
  const { animatedStyle: contentAnimatedStyle, startAnimation: startContentAnimation } =
    useFadeInAnimation(100, 300);

  const { animatedStyle: headerAnimatedStyle, startAnimation: startHeaderAnimation } =
    useFadeInAnimation(100, 300);

  const { animatedStyle: footerAnimatedStyle, startAnimation: startFooterAnimation } =
    useFadeInAnimation(300, 500);

  const { combinedBackButtonStyle, combinedBookmarkButtonStyle, combinedPlayButtonStyle } =
    useFloatingButtonAnimation(isButtonsVisible);

  // Animation styles - these are now directly from the hooks
  const contentPadding = useMemo(
    () => ({
      paddingTop: insets.top + (Platform.OS === 'ios' ? 20 : 16),
      paddingBottom: 4,
      backgroundColor: 'transparent',
    }),
    [insets.top]
  );

  // Pre-calculate the layout dimensions to prevent jumping
  const [layoutReady, setLayoutReady] = useState(false);

  // Use the navigation with debounce hook
  const { navigateTo, cleanup: cleanupNavigation } = useNavigationWithDebounce();

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;

      // Determine if buttons should be visible
      // Show buttons when at the top or scrolling up
      const isScrollingUp = currentScrollY < prevScrollYValue.current;
      const isAtTop = currentScrollY <= 0;
      const shouldBeVisible = isScrollingUp || isAtTop;

      // Update state only if it changed
      if (isButtonsVisible !== shouldBeVisible) {
        setIsButtonsVisible(shouldBeVisible);
      }

      prevScrollYValue.current = currentScrollY;
    },
    [isButtonsVisible]
  );

  // Component renderers
  const renderWord = useCallback(
    (
      word: Tables<'sentence_words'> & {
        root: Tables<'roots'> | null;
        word_type: Tables<'word_types'> | null;
      }
    ) => {
      const props = prepareWord(word);
      return (
        <ArabicWord
          key={props.key}
          word={props.word}
          isSelected={props.isSelected}
          onPress={props.onPress}
          scale={props.scale}
          baseSize={props.baseSize}
        />
      );
    },
    [prepareWord]
  );

  const renderSentenceItem = useCallback(
    ({ item: sentence }: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(sentence.id);
      return (
        <ArticleSentence
          key={sentence.id}
          sentence={sentence}
          words={
            words as (Tables<'sentence_words'> & {
              root: Tables<'roots'> | null;
              word_type: Tables<'word_types'> | null;
            })[]
          }
          renderWord={renderWord}
          settings={settings}
          colors={colors}
          containerStyle={{ backgroundColor: 'transparent' }}
        />
      );
    },
    [getWordsForSentence, renderWord, settings, colors]
  );

  const renderArticleCard = useCallback(
    (articleData: any) => (
      <CompactArticleCard
        key={articleData.id}
        article={articleData}
        onPress={() => handleArticlePress(articleData.id, true)} // Pass true to indicate this is a related article
      />
    ),
    [handleArticlePress]
  );

  // Effects
  // Content animation when article is loaded
  useEffect(() => {
    if (!isLoadingArticle && article) {
      // Set layout ready first to ensure dimensions are calculated
      setLayoutReady(true);

      // Use a small timeout to ensure layout is stable before animations start
      // Use a shorter timeout when data is prefetched, but always use a small delay to avoid layout issues
      const timer = setTimeout(
        () => {
          if (isMountedRef.current) {
            setIsLoading(false);
            // Make sure these functions exist before calling them
            if (startContentAnimation) startContentAnimation();
            if (startHeaderAnimation) startHeaderAnimation();
            if (startFooterAnimation) startFooterAnimation();
          }
        },
        !!isDataPrefetched ? 10 : 50
      );

      return () => clearTimeout(timer);
    }
  }, [
    isLoadingArticle,
    article,
    startContentAnimation,
    startHeaderAnimation,
    startFooterAnimation,
    isDataPrefetched,
  ]);

  // Reset scroll position when article ID changes
  useEffect(() => {
    if (flatListRef.current && id) {
      try {
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: false,
        });
      } catch (error) {
        // Silently handle errors
      }
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      const parsedId = parseInt(id as string, 10);
      if (!isNaN(parsedId)) {
        try {
          dispatch(addToReadingList(parsedId));
          dispatch(incrementReadCount(parsedId));
        } catch (_error) {
          // Silently handle errors
        }
      }
    }
  }, [id, dispatch, user]);

  useEffect(() => {
    if (articleId) {
      dispatch(updateLastOpenedArticle(articleId));
    }
  }, [articleId, dispatch]);

  // FlatList configuration
  const flatListConfig = useMemo(
    () => ({
      initialNumToRender: 10,
      maxToRenderPerBatch: 10,
      windowSize: 5,
      removeClippedSubviews: false,
      showsVerticalScrollIndicator: true,
      indicatorStyle: isDarkMode ? 'white' : ('black' as 'white' | 'black'),
    }),
    [isDarkMode]
  );

  // Handle back button press with debounce
  const handleBackPress = useCallback(() => {
    // Navigate back
    navigateTo('..', () => {
      // Any cleanup before navigation if needed
      if (isPlaying) {
        stopPlayback();
      }
    });
  }, [navigateTo, isPlaying, stopPlayback]);

  // Handle bookmark toggle with debounce for UI consistency
  const handleBookmarkPress = useCallback(() => {
    if (articleId) {
      lightFeedback(); // Light haptic feedback for bookmark toggle
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList]);

  // Generate audio URL from article content
  const generateArticleAudio = useCallback(() => {
    if (!article) return null;

    // Use the article's audio_url if available
    if (article.audio_url) {
      return article.audio_url;
    }

    // Fallback to a sample audio URL for testing
    return 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3';
  }, [article]);

  // Handle play button press
  const handlePlayPress = useCallback(async () => {
    if (isPlaying) {
      // If already playing, stop playback
      lightFeedback(); // Light haptic feedback for stopping

      // Update UI immediately for responsive feel
      setIsPlaying(false);
      await stopPlayback();
    } else {
      // If not playing, start playback
      const audioUrl = generateArticleAudio();

      if (!audioUrl) {
        return;
      }

      // Provide haptic feedback immediately
      lightFeedback(); // Light haptic feedback for starting playback

      // Update UI immediately for responsive feel
      setIsPlaying(true);

      // Load and play the audio
      const success = await loadAndPlayAudio(audioUrl);

      if (!success) {
        setIsPlaying(false);
        lightFeedback(); // Light haptic feedback for failure
      }
    }
  }, [isPlaying, generateArticleAudio, loadAndPlayAudio, stopPlayback]);

  // Audio state change handler
  useEffect(() => {
    // Handle audio state transitions
    if (audioState === AUDIO_STATES.PLAYING) {
      // When audio starts playing, show stop button
      setIsPlaying(true);
    } else if (
      audioState === AUDIO_STATES.IDLE ||
      audioState === AUDIO_STATES.ERROR ||
      (audioState === AUDIO_STATES.PAUSED && prevAudioStateRef.current === AUDIO_STATES.PLAYING)
    ) {
      // Reset to play button when:
      // 1. Audio is idle or has an error, OR
      // 2. Audio transitions from playing to paused (which happens when audio completes)
      setIsPlaying(false);

      // Provide haptic feedback when audio completes
      if (prevAudioStateRef.current === AUDIO_STATES.PLAYING) {
        successFeedback();
      }
    }

    // Store current state for next comparison
    prevAudioStateRef.current = audioState;
  }, [audioState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanupNavigation();

      // Stop any audio playback when unmounting
      try {
        stopPlayback();
      } catch (error) {
        // Silently handle errors
      }

      // Reset the play button state
      setIsPlaying(false);
    };
  }, [cleanupNavigation, stopPlayback]);

  // Main render
  if (isLoading || isLoadingArticle) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        useSafeArea={true}
        safeAreaEdges={['top', 'left', 'right']}
      >
        <LoadingScreen />
      </ThemedView>
    );
  }

  if (!article) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Article not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={styles.container}
      useSafeArea={true}
      safeAreaEdges={['top', 'left', 'right']}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Back button */}
      <FloatingButton
        position="left"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={combinedBackButtonStyle}
        onPress={handleBackPress}
        iconName="chevron-back"
        accessibilityLabel="Return to previous screen"
        colors={colors}
        isDarkMode={isDarkMode}
      />

      {/* Bookmark button */}
      {user && (
        <FloatingButton
          position="right"
          top={insets.top + LAYOUT.SPACING.MEDIUM}
          animatedStyle={combinedBookmarkButtonStyle}
          onPress={handleBookmarkPress}
          iconName={isInReadingList ? 'bookmark' : 'bookmark-outline'}
          accessibilityLabel={isInReadingList ? 'Remove from reading list' : 'Add to reading list'}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Play/Stop button */}
      <FloatingButton
        position="right"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={combinedPlayButtonStyle}
        iconName={isPlaying ? 'stop' : 'play'}
        accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio'}
        onPress={handlePlayPress}
        colors={colors}
        isDarkMode={isDarkMode}
        style={{
          right: user
            ? LAYOUT.BUTTON.HEIGHT.MEDIUM + LAYOUT.SPACING.MEDIUM + 10
            : LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
        }}
      />

      {/* Article content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[{ flex: 1, backgroundColor: 'transparent' }, contentAnimatedStyle as any]}
        >
          {/* Only render FlatList if we have data */}
          {sortedSentences && sortedSentences.length > 0 && (
            <FlatList
              key={`article-${id}`}
              ref={flatListRef}
              data={sortedSentences}
              renderItem={renderSentenceItem}
              keyExtractor={item => item.id.toString()}
              style={[styles.content, { backgroundColor: colors.background }]}
              contentContainerStyle={[styles.sentenceList, contentPadding]}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              initialNumToRender={10}
              ListHeaderComponent={
                <Animated.View style={headerAnimatedStyle as any}>
                  <ArticleHeader article={article} colors={colors} isDarkMode={isDarkMode} />
                </Animated.View>
              }
              ListFooterComponent={
                <>
                  {/* Only render related articles sections if we have data */}
                  {otherArticles && otherArticles.length > 0 && (
                    <Animated.View style={footerAnimatedStyle as any}>
                      <RelatedArticlesFooter
                        otherArticles={otherArticles}
                        otherCategoryArticles={otherCategoryArticles || []}
                        article={article}
                        renderArticleCard={renderArticleCard}
                      />
                    </Animated.View>
                  )}
                </>
              }
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={false}
              indicatorStyle={isDarkMode ? 'white' : 'black'}
            />
          )}
        </Animated.View>
      </View>
    </ThemedView>
  );
}
