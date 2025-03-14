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
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

// Components
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ArabicWord } from '@/components/ArabicWord';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import { LoadingScreen } from '@/components/Loader';
import { ArticleSentence } from '@/components/ArticleSentence';
import { RelatedArticlesSection } from '@/components/RelatedArticlesSection';
import ArticleHeader from '@/components/ArticleHeader';
import FloatingButton from '@/components/FloatingButton';

// Hooks
import { useColors } from '@/hooks/useColors';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { useFadeInAnimation, useSlideAnimation, useOpacityAnimation } from '@/hooks/animations';

// Services
import { articlesService } from '@/services/articles';
import { studyWordsService } from '@/services/study_words';
import { readingListService } from '@/services/reading_list';

// Store
import {
  addToReadingList,
  incrementReadCount,
  updateLastOpenedArticle,
} from '@/store/readingListSlice';

// Constants
import { LAYOUT } from '@/constants/layout';

// Types
import type { Tables } from '@/types/database.types';
import type { Article } from '@/types/articles.types';

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
  relatedArticlesContainer: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  contentContainer: {
    flex: 1,
  },
});

// Helper function to enhance word data
const enhanceWord = (word: Tables<'sentence_words'>) => ({
  ...word,
  root: null,
  word_type: null,
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Tables<'article_sentences'>>>(null);

  // Animation state
  const [isButtonsVisible, setIsButtonsVisible] = useState(true);
  const prevScrollYValue = useRef(0);

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Fetch article data
  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesService.getArticleById(articleId!),
    enabled: !!articleId,
  });

  // Check if article is in reading list
  const { data: isInReadingList = false, refetch: refetchReadingListStatus } = useQuery({
    queryKey: ['isInReadingList', user?.id, articleId],
    queryFn: () => readingListService.isInReadingList(user!.id, articleId!),
    enabled: !!user && !!articleId,
  });

  // Fetch study words
  const { data: studyWords = [] } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id, { forStats: false }),
    enabled: !!user,
    staleTime: 60000, // 1 minute cache
  });

  // Fetch more articles by the same author
  const { data: moreArticles = [] } = useQuery({
    queryKey: ['articles', 'author', article?.author?.id],
    queryFn: () => articlesService.getArticles(undefined, article!.author!.id),
    enabled: !!article?.author?.id,
  });

  // Fetch more articles in the same category
  const { data: categoryArticles = [] } = useQuery({
    queryKey: ['articles', 'category', article?.category?.id],
    queryFn: () => articlesService.getArticles(article!.category!.id),
    enabled: !!article?.category?.id,
  });

  // Mutations
  const addToReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.addToReadingList(userId, articleId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Added to bookmarks',
        position: 'bottom',
      });
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add to bookmarks',
        position: 'bottom',
      });
    },
  });

  const removeFromReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.removeFromReadingList(userId, articleId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Removed from bookmarks',
        position: 'bottom',
      });
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove from bookmarks',
        position: 'bottom',
      });
    },
  });

  const toggleWordMutation = useMutation({
    mutationFn: async ({ userId, wordId }: { userId: string; wordId: number }) =>
      studyWordsService.toggleStudyWord(userId, wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyWords', user?.id] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update word status',
      });
    },
  });

  // Animation hooks
  const { animatedStyle: contentAnimatedStyle, startAnimation: startContentAnimation } =
    useFadeInAnimation(0, 300);

  const {
    animatedStyle: backButtonAnimatedStyle,
    startAnimation: startBackButtonAnimation,
    reset: resetBackButtonAnimation,
  } = useSlideAnimation(0, 20, 100, 'left');

  const {
    animatedStyle: playlistButtonAnimatedStyle,
    startAnimation: startPlaylistButtonAnimation,
    reset: resetPlaylistButtonAnimation,
  } = useSlideAnimation(0, 20, 100, 'left');

  const { opacity: buttonsOpacity } = useOpacityAnimation(1, 200);

  // Combined animated styles
  const combinedBackButtonStyle = useAnimatedStyle(
    () => ({
      transform: [...(backButtonAnimatedStyle.transform || [])],
      opacity: buttonsOpacity.value,
    }),
    [backButtonAnimatedStyle, buttonsOpacity]
  );

  const combinedPlaylistButtonStyle = useAnimatedStyle(
    () => ({
      transform: [...(playlistButtonAnimatedStyle.transform || [])],
      opacity: buttonsOpacity.value,
    }),
    [playlistButtonAnimatedStyle, buttonsOpacity]
  );

  // Derived state
  const selectedWordIds = useMemo(
    () => new Set(studyWords.map(w => w.sentence_word_id)),
    [studyWords]
  );

  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) return [];
    return [...article.article_sentences].sort((a, b) => a.position - b.position);
  }, [article?.article_sentences]);

  const sentenceWordsMap = useMemo(() => {
    if (!sortedSentences.length) return new Map();

    const wordsMap = new Map();
    sortedSentences.forEach(sentence => {
      wordsMap.set(
        sentence.id,
        [...sentence.sentence_words].sort((a, b) => a.position - b.position)
      );
    });
    return wordsMap;
  }, [sortedSentences]);

  const otherArticles = useMemo(
    () => moreArticles.filter(a => a.id !== article?.id),
    [moreArticles, article?.id]
  );

  const otherCategoryArticles = useMemo(
    () => categoryArticles.filter(a => a.id !== article?.id),
    [categoryArticles, article?.id]
  );

  // Animation styles - these are now directly from the hooks
  const contentPadding = useMemo(
    () => ({
      paddingTop: insets.top + (Platform.OS === 'ios' ? 70 : 65),
      paddingBottom: 4,
      backgroundColor: 'transparent',
    }),
    [insets.top]
  );

  // Event handlers
  const handleToggleReadingList = useCallback(() => {
    if (!user || !articleId) return;

    if (isInReadingList) {
      removeFromReadingListMutation.mutate({ userId: user.id, articleId });
    } else {
      addToReadingListMutation.mutate({ userId: user.id, articleId });
    }
  }, [user, articleId, isInReadingList, addToReadingListMutation, removeFromReadingListMutation]);

  const handleWordPress = useCallback(
    (word: Tables<'sentence_words'>) => {
      if (!user) return;
      toggleWordMutation.mutate({ userId: user.id, wordId: word.id });
    },
    [user, toggleWordMutation]
  );

  const handleArticlePress = useCallback((articleId: number) => {
    router.push({
      pathname: '/article/[id]',
      params: { id: articleId },
    });
  }, []);

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
    (word: Tables<'sentence_words'>) => {
      const enhancedWord = enhanceWord(word);
      const isSelected = selectedWordIds.has(word.id);

      return (
        <ArabicWord
          key={word.id}
          word={enhancedWord}
          isSelected={isSelected}
          onPress={handleWordPress}
          scale={settings.fontScale}
          baseSize={24}
        />
      );
    },
    [handleWordPress, selectedWordIds, settings.fontScale]
  );

  const renderSentenceItem = useCallback(
    ({ item: sentence }: { item: Tables<'article_sentences'> }) => {
      const words = sentenceWordsMap.get(sentence.id) || [];
      return (
        <ArticleSentence
          key={sentence.id}
          sentence={sentence}
          words={words}
          renderWord={renderWord}
          settings={settings}
          colors={colors}
          containerStyle={{ backgroundColor: 'transparent' }}
        />
      );
    },
    [sentenceWordsMap, renderWord, settings, colors]
  );

  const renderArticleCard = useCallback(
    (articleData: Article) => (
      <CompactArticleCard
        key={articleData.id}
        article={articleData}
        onPress={() => handleArticlePress(articleData.id)}
      />
    ),
    [handleArticlePress]
  );

  // Render related articles footer
  const renderRelatedArticlesFooter = useCallback(() => {
    if (!otherArticles.length && !otherCategoryArticles.length) return null;

    return (
      <View style={styles.relatedArticlesContainer}>
        {otherArticles.length > 0 && (
          <RelatedArticlesSection
            title={`More from ${article?.author?.name}`}
            articles={otherArticles}
            renderArticleCard={renderArticleCard}
          />
        )}

        {otherCategoryArticles.length > 0 && (
          <RelatedArticlesSection
            title={`More from ${article?.category?.name}`}
            articles={otherCategoryArticles}
            renderArticleCard={renderArticleCard}
          />
        )}
      </View>
    );
  }, [otherArticles, otherCategoryArticles, article, renderArticleCard]);

  // Effects
  // Content animation when article is loaded
  useEffect(() => {
    if (!isLoadingArticle && article) {
      setIsLoading(false);
      startContentAnimation();
    }
  }, [isLoadingArticle, article, startContentAnimation]);

  // Button animations based on visibility state
  useEffect(() => {
    // Simple fade animation
    buttonsOpacity.value = withTiming(isButtonsVisible ? 1 : 0, {
      duration: 200,
    });

    // Position animations
    if (isButtonsVisible) {
      startBackButtonAnimation();
      startPlaylistButtonAnimation();
    } else {
      resetBackButtonAnimation();
      resetPlaylistButtonAnimation();
    }
  }, [
    isButtonsVisible,
    buttonsOpacity,
    startBackButtonAnimation,
    startPlaylistButtonAnimation,
    resetBackButtonAnimation,
    resetPlaylistButtonAnimation,
  ]);

  // Reset scroll position when article ID changes
  useEffect(() => {
    if (flatListRef.current && id) {
      flatListRef.current.scrollToOffset({
        offset: 0,
        animated: false,
      });
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

  // Render loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Render article not found
  if (!article) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Article not found</ThemedText>
      </ThemedView>
    );
  }

  // Render article screen
  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Back button */}
      <FloatingButton
        position="left"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={combinedBackButtonStyle}
        onPress={() => router.back()}
        iconName="chevron-back"
        accessibilityLabel="Go back"
        colors={colors}
        isDarkMode={isDarkMode}
      />

      {/* Bookmark button */}
      {user && (
        <FloatingButton
          position="right"
          top={insets.top + LAYOUT.SPACING.MEDIUM}
          animatedStyle={combinedPlaylistButtonStyle}
          onPress={handleToggleReadingList}
          iconName={isInReadingList ? 'bookmark' : 'bookmark-outline'}
          accessibilityLabel={isInReadingList ? 'Remove from bookmarks' : 'Add to bookmarks'}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Article content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={[{ flex: 1, backgroundColor: 'transparent' }, contentAnimatedStyle]}>
          <FlatList
            key={`article-${id}`}
            ref={flatListRef}
            data={sortedSentences}
            renderItem={renderSentenceItem}
            keyExtractor={item => item.id.toString()}
            style={[styles.content, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.sentenceList, contentPadding]}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <ArticleHeader article={article} colors={colors} isDarkMode={isDarkMode} />
            }
            ListFooterComponent={renderRelatedArticlesFooter}
            {...flatListConfig}
          />
        </Animated.View>
      </View>
    </ThemedView>
  );
}
