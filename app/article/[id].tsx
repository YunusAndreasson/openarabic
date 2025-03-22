import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
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
import Animated from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';

// Components
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ArabicWord } from '@/components/ArabicWord';
import { LoadingScreen } from '@/components/Loader';
import { ArticleSentence } from '@/components/ArticleSentence';
import ArticleHeader from '@/components/ArticleHeader';
import FloatingButton from '@/components/FloatingButton';
import RelatedArticlesFooter from '@/components/RelatedArticlesFooter';
import ThemedCard from '@/components/ThemedCard';

// Hooks
import { useColors } from '@/hooks/useColors';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { useScreenAnimations } from '@/hooks/animations';
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
import { successFeedback, lightFeedback } from '@/utils/haptics';

// Types
import type { Tables } from '@/types/database.types';

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
  floatingButton: {
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  loadingContainer: {
    paddingTop: 0, // Will be set dynamically with insets
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0, // Will be set dynamically with insets
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

  // Scroll position tracking
  const prevScrollYValue = useRef(0);

  // Play/Stop button state
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio player hook
  const { audioState, loadAndPlayAudio, stopPlayback } = useAudioPlayer();

  // Unified animations hook for all screen animations
  const {
    contentStyle,
    headerStyle,
    footerStyle,
    backButtonStyle,
    bookmarkButtonStyle,
    playButtonStyle,
    startAllAnimations,
    handleScroll: handleAnimationScroll,
  } = useScreenAnimations();

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Check if data is already in cache to optimize loading time
  const isDataPrefetched = useMemo(() => {
    if (!articleId) return false;
    const cachedData = queryClient.getQueryData(['article', articleId]);
    return cachedData !== undefined && cachedData !== null;
  }, [articleId, queryClient]);

  // Use the custom loading state hook
  const { setDataLoaded } = useLoadingState(true);

  // Update minimum loading time when prefetched status changes
  useEffect(() => {
    if (isDataPrefetched) {
      setDataLoaded(true);
    }
  }, [isDataPrefetched, setDataLoaded]);

  // Use the custom article data hook with optimized loading behavior
  const {
    article,
    isLoadingArticle,
    isInReadingList,
    refetchReadingListStatus,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    otherArticles,
    otherCategoryArticles,
  } = useArticleData(articleId, user?.id, !!isDataPrefetched);

  // Use the custom article mutations hook
  const { handleToggleReadingList, handleWordPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus
  );

  // Use the custom article renderers hook
  const { prepareWord, handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    colors,
    new Set([...selectedWordIds].map(id => (typeof id === 'string' ? parseInt(id, 10) : id))),
    sentenceWordsMap,
    (word: Tables<'sentence_words'>) => handleWordPress(word.id)
  );

  // Use the navigation with debounce hook - fix cleanup property error
  const { navigateTo } = useNavigationWithDebounce();

  // Handle scroll with animation
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Always maintain UI elements when at top of screen
      if (event.nativeEvent.contentOffset.y <= 0) {
        prevScrollYValue.current = 0;
      }

      // Pass scroll events to animation handler
      handleAnimationScroll(event, prevScrollYValue);
    },
    [handleAnimationScroll]
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
      <ThemedCard
        key={articleData.id}
        variant="compact"
        article={articleData}
        onPress={() => handleArticlePress(articleData.id, true)}
      />
    ),
    [handleArticlePress]
  );

  // Handle back button press
  const handleBackPress = useCallback(() => {
    navigateTo('..', () => {
      if (isPlaying) {
        stopPlayback();
      }
    });
  }, [navigateTo, isPlaying, stopPlayback]);

  // Handle bookmark toggle
  const handleBookmarkPress = useCallback(() => {
    if (articleId) {
      lightFeedback();
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList]);

  // Generate audio URL from article content
  const generateArticleAudio = useCallback(() => {
    if (!article) return null;
    return (
      article.audio_url ||
      'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3'
    );
  }, [article]);

  // Handle play button press
  const handlePlayPress = useCallback(async () => {
    if (isPlaying) {
      lightFeedback();
      setIsPlaying(false);
      await stopPlayback();
    } else {
      const audioUrl = generateArticleAudio();
      if (!audioUrl) return;

      lightFeedback();
      setIsPlaying(true);
      const success = await loadAndPlayAudio(audioUrl);

      if (!success) {
        setIsPlaying(false);
        lightFeedback();
      }
    }
  }, [isPlaying, generateArticleAudio, loadAndPlayAudio, stopPlayback]);

  // Content animation when article is loaded
  useEffect(() => {
    if (!isLoadingArticle && article) {
      const timer = setTimeout(
        () => {
          if (isMountedRef.current) {
            setIsLoading(false);
            // Use the unified animation start function
            startAllAnimations();
          }
        },
        !!isDataPrefetched ? 10 : 50
      );

      return () => clearTimeout(timer);
    }
  }, [isLoadingArticle, article, startAllAnimations, isDataPrefetched]);

  // Reset scroll position when article ID changes
  useEffect(() => {
    if (flatListRef.current && id) {
      try {
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: false,
        });
      } catch (error) {
        // Silent error handling
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
          // Silent error handling
        }
      }
    }
  }, [id, dispatch, user]);

  useEffect(() => {
    if (articleId) {
      dispatch(updateLastOpenedArticle(articleId));
    }
  }, [articleId, dispatch]);

  // Audio state change handler
  useEffect(() => {
    if (audioState === AUDIO_STATES.PLAYING) {
      setIsPlaying(true);
    } else if (
      audioState === AUDIO_STATES.IDLE ||
      audioState === AUDIO_STATES.ERROR ||
      (audioState === AUDIO_STATES.PAUSED && prevAudioStateRef.current === AUDIO_STATES.PLAYING)
    ) {
      setIsPlaying(false);

      if (prevAudioStateRef.current === AUDIO_STATES.PLAYING) {
        successFeedback();
      }
    }

    prevAudioStateRef.current = audioState;
  }, [audioState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      try {
        stopPlayback();
      } catch (error) {
        // Silent error handling
      }

      setIsPlaying(false);
    };
  }, [stopPlayback]);

  // Main render - Only show loading when no cached data is available
  if ((isLoading || isLoadingArticle) && !isDataPrefetched) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        useSafeArea={false}
      >
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <LoadingScreen />
        </View>
      </ThemedView>
    );
  }

  if (!article) {
    return (
      <ThemedView style={styles.container} useSafeArea={false}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />
        <View style={[styles.notFoundContainer, { paddingTop: insets.top }]}>
          <ThemedText>Article not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />

      {/* Back button */}
      <FloatingButton
        position="left"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={backButtonStyle}
        onPress={handleBackPress}
        iconName="chevron-back"
        accessibilityLabel="Return to previous screen"
        colors={colors}
        isDarkMode={isDarkMode}
        style={styles.floatingButton}
      />

      {/* Bookmark button */}
      {user && (
        <FloatingButton
          position="right"
          top={insets.top + LAYOUT.SPACING.MEDIUM}
          animatedStyle={bookmarkButtonStyle}
          onPress={handleBookmarkPress}
          iconName={isInReadingList ? 'bookmark' : 'bookmark-outline'}
          accessibilityLabel={isInReadingList ? 'Remove from reading list' : 'Add to reading list'}
          colors={colors}
          isDarkMode={isDarkMode}
          style={styles.floatingButton}
        />
      )}

      {/* Play/Stop button */}
      <FloatingButton
        position="right"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={playButtonStyle}
        iconName={isPlaying ? 'stop' : 'play'}
        accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio'}
        onPress={handlePlayPress}
        colors={colors}
        isDarkMode={isDarkMode}
        style={{
          ...styles.floatingButton,
          right: user
            ? LAYOUT.BUTTON.HEIGHT.MEDIUM + LAYOUT.SPACING.MEDIUM + 10
            : LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
        }}
      />

      {/* Article content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[{ flex: 1, backgroundColor: 'transparent' }, contentStyle]}>
          {sortedSentences && sortedSentences.length > 0 && (
            <FlatList
              key={`article-${id}`}
              ref={flatListRef}
              data={sortedSentences}
              renderItem={renderSentenceItem}
              keyExtractor={item => item.id.toString()}
              style={[styles.content, { backgroundColor: colors.background }]}
              contentContainerStyle={[
                styles.sentenceList,
                {
                  paddingTop: insets.top + (Platform.OS === 'ios' ? 40 : 30),
                  paddingBottom: insets.bottom + 20,
                  backgroundColor: 'transparent',
                },
              ]}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={false}
              indicatorStyle={isDarkMode ? 'white' : 'black'}
              contentInsetAdjustmentBehavior="automatic"
              getItemLayout={(_data, index) => ({
                length: 70,
                offset: 70 * index + (article?.title ? 150 : 0),
                index,
              })}
              ListHeaderComponent={
                <Animated.View style={[headerStyle, { paddingTop: 16 }]}>
                  <ArticleHeader article={article} colors={colors} isDarkMode={isDarkMode} />
                </Animated.View>
              }
              ListFooterComponent={
                otherArticles && otherArticles.length > 0 ? (
                  <Animated.View style={footerStyle}>
                    <RelatedArticlesFooter
                      otherArticles={otherArticles}
                      otherCategoryArticles={otherCategoryArticles || []}
                      article={article}
                      renderArticleCard={renderArticleCard}
                    />
                  </Animated.View>
                ) : null
              }
            />
          )}
        </Animated.View>
      </View>
    </ThemedView>
  );
}
