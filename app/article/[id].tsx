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
import { useAppSelector } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { useScreenAnimations } from '@/hooks/animations';
import { useArticleData } from '@/hooks/useArticleData';
import { useArticleMutations } from '@/hooks/useArticleMutations';
import { useArticleRenderers } from '@/hooks/useArticleRenderers';
import { useNavigationWithDebounce } from '@/hooks';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useLoadingState } from '@/hooks/useLoadingState';

// Store

// Constants
import { LAYOUT } from '@/constants/layout';

// Utils
import { lightFeedback } from '@/utils/haptics';

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
  // Static buttons container that won't use animations
  staticButtonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER + 1, // Higher than other content
  },
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Tables<'article_sentences'>>>(null);
  const queryClient = useQueryClient();

  // Track component mounted state
  const isMountedRef = useRef(true);

  // Track previous audio state to detect transitions

  // Scroll position tracking
  const prevScrollYValue = useRef(0);

  // Play/Stop button state
  const [isPlaying, setIsPlaying] = useState(false);

  // FORCE a default bookmark icon to ensure it's always visible
  const [initialBookmarkIcon, setInitialBookmarkIcon] = useState<'bookmark-outline' | 'bookmark'>(
    'bookmark-outline'
  );

  // Navigation hook
  const { navigateTo } = useNavigationWithDebounce();

  // Audio player hook
  const { loadAndPlayAudio, stopPlayback } = useAudioPlayer();

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Always fetch fresh data - no caching
  const isDataPrefetched = false;

  // Use the custom loading state hook
  const { setDataLoaded } = useLoadingState(true);

  // Update minimum loading time when prefetched status changes
  useEffect(() => {
    // Always show loading state regardless of cache
    setDataLoaded(false);
  }, [setDataLoaded]);

  // Extract article data hook before using any results
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

  // Add console logs for debugging
  useEffect(() => {
    console.log('Article data:', !!article);
    console.log('Sorted sentences:', sortedSentences?.length || 0);
    console.log(
      'Sentence words map size:',
      sentenceWordsMap
        ? sentenceWordsMap instanceof Map
          ? sentenceWordsMap.size
          : 'Not a Map'
        : 'No map'
    );
    if (sortedSentences?.length) {
      console.log('First sentence ID:', sortedSentences[0]?.id);
      if (sentenceWordsMap instanceof Map) {
        console.log(
          'Words for first sentence:',
          sentenceWordsMap.get(sortedSentences[0]?.id)?.length || 0
        );
      }
    }
  }, [article, sortedSentences, sentenceWordsMap]);

  // Use animation hook for content and button visibility on scroll
  const {
    contentStyle,
    headerStyle,
    footerStyle,
    backButtonStyle,
    bookmarkButtonStyle,
    playButtonStyle,
    startAllAnimations,
    handleScroll: handleAnimationScroll,
  } = useScreenAnimations(true); // Initialize with buttons visible

  // Start content animations when mounted
  useEffect(() => {
    if (isMountedRef.current) {
      startAllAnimations();
    }
  }, [startAllAnimations]);

  // Handle article data hook callbacks
  const { handleToggleReadingList, handleWordPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus
  );

  // Use the article renderers hook as usual
  const { prepareWord, handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    colors,
    // Simply pass the selectedWordIds directly now that our hooks handle type consistency
    selectedWordIds,
    sentenceWordsMap || new Map(),
    (word: Tables<'sentence_words'>) => handleWordPress(word.id)
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
    if (articleId && user) {
      lightFeedback();
      // Update local state immediately for better UX
      setInitialBookmarkIcon(isInReadingList ? 'bookmark-outline' : 'bookmark');
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList, user]);

  // Update bookmark icon when data loads
  useEffect(() => {
    if (isInReadingList === true) {
      setInitialBookmarkIcon('bookmark');
    }
  }, [isInReadingList]);

  // Make sure we use initialBookmarkIcon as fallback
  const bookmarkIconToDisplay = (
    isInReadingList === true
      ? 'bookmark'
      : isInReadingList === false
        ? 'bookmark-outline'
        : initialBookmarkIcon
  ) as 'bookmark' | 'bookmark-outline';

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

  // Static rendering of floating buttons - will always be visible immediately but fade with scroll
  const StaticButtons = () => (
    <View style={styles.staticButtonsContainer}>
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
        style={{
          ...styles.floatingButton,
          left: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
        }}
      />

      {/* ALWAYS show bookmark button regardless of user state */}
      <FloatingButton
        position="right"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={bookmarkButtonStyle}
        onPress={user ? () => handleBookmarkPress() : () => {}}
        iconName={bookmarkIconToDisplay}
        accessibilityLabel={isInReadingList ? 'Remove from reading list' : 'Add to reading list'}
        colors={colors}
        isDarkMode={isDarkMode}
        isBookmarked={isInReadingList}
        style={{
          ...styles.floatingButton,
          right: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
          opacity: user ? 1 : 0.3, // Show dimmed if no user but ALWAYS visible
        }}
      />

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
          right: LAYOUT.BUTTON.HEIGHT.MEDIUM + LAYOUT.SPACING.MEDIUM + 10,
        }}
      />
    </View>
  );

  // Main render - loading state
  if (isLoadingArticle && !isDataPrefetched) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        useSafeArea={false}
      >
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <LoadingScreen />
        </View>

        {/* Static buttons are always rendered */}
        <StaticButtons />
      </ThemedView>
    );
  }

  // Article not found state
  if (!article) {
    return (
      <ThemedView style={styles.container} useSafeArea={false}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />
        <View style={[styles.notFoundContainer, { paddingTop: insets.top }]}>
          <ThemedText>Article not found</ThemedText>
        </View>

        {/* Static buttons are always rendered */}
        <StaticButtons />
      </ThemedView>
    );
  }

  // Main article view
  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />

      {/* Static buttons are always rendered */}
      <StaticButtons />

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
                <Animated.View style={[headerStyle]}>
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
