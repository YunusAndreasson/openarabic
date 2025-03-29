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
import { ArticleSentence, ArticleHeader, RelatedArticlesFooter } from '@/components/article';
import FloatingButton from '@/components/FloatingButton';
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

// Services
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

// Types
import type { Tables } from '@/types/database.types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  sentenceList: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  contentContainer: {
    flex: 1,
  },
  floatingButton: {
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0, // Remove the top padding since we're centering
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
  userButtonActive: {
    opacity: 1,
  },
  userButtonInactive: {
    opacity: 0.3,
  },
  flexOne: {
    flex: 1,
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

  // Use the custom loading state hook
  const { setDataLoaded } = useLoadingState(true);

  // Pre-fetch study words if user is logged in
  useEffect(() => {
    if (user?.id) {
      queryClient.prefetchQuery({
        queryKey: ['studyWords', user.id],
        queryFn: () => studyWordsFSRSService.getFSRSWords(user.id),
        staleTime: 180000, // 3 minutes
        retry: 2,
      });
    }
  }, [user?.id, queryClient]);

  // Update minimum loading time when prefetched status changes
  useEffect(() => {
    setDataLoaded(false);
  }, [setDataLoaded]);

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

  // Use animation hook for content and button visibility on scroll
  const {
    footerStyle,
    backButtonStyle,
    bookmarkButtonStyle,
    playButtonStyle,
    startAllAnimations,
    handleScroll: handleAnimationScroll,
  } = useScreenAnimations(true);

  // Update bookmark icon when reading list status changes
  useEffect(() => {
    if (!isLoadingReadingList) {
      setInitialBookmarkIcon(isInReadingList ? 'bookmark' : 'bookmark-outline');
    }
  }, [isLoadingReadingList, isInReadingList]);

  // Check if all data is loaded
  const isLoading = useMemo(() => {
    return (
      isLoadingArticle ||
      isLoadingReadingList ||
      !article?.article_sentences ||
      !sentenceWordsMap ||
      (article.article_sentences.length > 0 && !sortedSentences?.length)
    );
  }, [isLoadingArticle, isLoadingReadingList, article, sentenceWordsMap, sortedSentences]);

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
  const { prepareWord, handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    colors,
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

  // Handle bookmark toggle with optimistic updates
  const handleBookmarkPress = useCallback(() => {
    if (articleId && user) {
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

  // Handle scroll with animation
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
    [handleAnimationScroll, isHeaderVisible]
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
        position="top-left"
        buttonType="back"
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
        position="top-right"
        buttonType="bookmark"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={bookmarkButtonStyle}
        onPress={user ? () => handleBookmarkPress() : () => {}}
        iconName={initialBookmarkIcon}
        accessibilityLabel={isInReadingList ? 'Remove from reading list' : 'Add to reading list'}
        colors={colors}
        isDarkMode={isDarkMode}
        isBookmarked={isInReadingList}
        style={{
          ...styles.floatingButton,
          right: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
          ...(user ? styles.userButtonActive : styles.userButtonInactive),
        }}
      />

      {/* Play/Stop button */}
      <FloatingButton
        position="top-right"
        buttonType="play"
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

  StaticButtons.displayName = 'StaticButtons';

  // Main render - loading state
  if (isLoading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        useSafeArea={false}
      >
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} animated={true} />
        <View style={[styles.loadingContainer]}>
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
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} animated={true} />
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
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        translucent={true}
        animated={true}
        hidden={!isHeaderVisible}
      />

      {/* Static buttons are always rendered */}
      <StaticButtons />

      {/* Article content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.flexOne]}>
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
                },
              ]}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              initialNumToRender={35}
              maxToRenderPerBatch={20}
              windowSize={10}
              removeClippedSubviews={Platform.OS === 'android'}
              updateCellsBatchingPeriod={50}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              indicatorStyle={isDarkMode ? 'white' : 'black'}
              contentInsetAdjustmentBehavior="automatic"
              getItemLayout={(_data, index) => ({
                length: 70,
                offset: 70 * index + (article?.title ? 150 : 0),
                index,
              })}
              ListHeaderComponent={
                <Animated.View>
                  <ArticleHeader article={article} colors={colors} />
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
