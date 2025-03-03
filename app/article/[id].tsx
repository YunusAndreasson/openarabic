import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  StyleSheet,
  View,
  FlatList,
  Platform,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import { articlesService } from '@/services/articles';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAppSelector } from '@/store/hooks';
import { ArabicWord } from '@/components/ArabicWord';
import type { Tables } from '@/types/database.types';
import { studyWordsService } from '@/services/study_words';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen } from '@/components/Loader';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { ArticleSentence } from '@/components/ArticleSentence';
import { RelatedArticlesSection } from '@/components/RelatedArticlesSection';
import type { Article } from '@/types/articles.types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readingListService } from '@/services/reading_list';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  sentenceList: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  relatedArticlesContainer: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  backButton: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    left: 15,
  },
  playlistButton: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    right: 15,
  },
  buttonBlur: {
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: LAYOUT.OPACITY.OVERLAY,
  },
  buttonIcon: {
    alignSelf: 'center',
  },
  backButtonContainer: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    left: 15,
  },
});

// Threshold for scroll direction detection
const SCROLL_THRESHOLD = 10;

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Animation values for back button using Reanimated
  const backButtonAnim = useSharedValue(0);
  const [isBackButtonVisible, setIsBackButtonVisible] = useState(true);
  const prevScrollYValue = useRef(0);

  // Parse article ID once
  const articleId = useMemo(() => {
    if (!id) return undefined;
    return parseInt(id) || undefined;
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

  // Add to reading list mutation
  const addToReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.addToReadingList(userId, articleId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Added to playlist',
        position: 'bottom',
      });
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add to playlist',
        position: 'bottom',
      });
    },
  });

  // Remove from reading list mutation
  const removeFromReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.removeFromReadingList(userId, articleId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Removed from playlist',
        position: 'bottom',
      });
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove from playlist',
        position: 'bottom',
      });
    },
  });

  // Toggle article in reading list
  const handleToggleReadingList = useCallback(() => {
    if (!user || !articleId) return;

    if (isInReadingList) {
      removeFromReadingListMutation.mutate({ userId: user.id, articleId });
    } else {
      addToReadingListMutation.mutate({ userId: user.id, articleId });
    }
  }, [user, articleId, isInReadingList, addToReadingListMutation, removeFromReadingListMutation]);

  // Update animation when visibility changes using Reanimated
  useEffect(() => {
    backButtonAnim.value = withTiming(isBackButtonVisible ? 0 : -80, {
      duration: 200,
    });
  }, [isBackButtonVisible, backButtonAnim]);

  // Set loading state based on article loading
  useEffect(() => {
    if (!isLoadingArticle && article) {
      setIsLoading(false);
    }
  }, [isLoadingArticle, article]);

  // Fetch study words
  const { data: studyWords = [] } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id, { forStats: false }),
    enabled: !!user,
    staleTime: 60000, // 1 minute cache
  });

  // Create a set of selected word IDs for faster lookups - using a Set improves lookup performance
  const selectedWordIds = useMemo(
    () => new Set(studyWords.map(w => w.sentence_word_id)),
    [studyWords]
  );

  // Toggle word mutation
  const toggleWordMutation = useMutation({
    mutationFn: async ({ userId, wordId }: { userId: string; wordId: number }) =>
      studyWordsService.toggleStudyWord(userId, wordId),
    onSuccess: () => {
      // Only invalidate the studyWords query for the current user
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

  // Handle word press
  const handleWordPress = useCallback(
    async (word: Tables<'sentence_words'>) => {
      if (!user) return;
      toggleWordMutation.mutate({ userId: user.id, wordId: word.id });
    },
    [user, toggleWordMutation]
  );

  // Fetch more articles by the same author
  const { data: moreArticles = [] } = useQuery({
    queryKey: ['articles', 'author', article?.author?.id],
    queryFn: () => articlesService.getArticles(undefined, article!.author!.id),
    enabled: !!article?.author?.id,
  });

  // Filter out the current article from author articles
  const otherArticles = useMemo(
    () => moreArticles.filter(a => a.id !== article?.id),
    [moreArticles, article?.id]
  );

  // Fetch more articles in the same category
  const { data: categoryArticles = [] } = useQuery({
    queryKey: ['articles', 'category', article?.category?.id],
    queryFn: () => articlesService.getArticles(article!.category!.id),
    enabled: !!article?.category?.id,
  });

  // Filter out the current article from category articles
  const otherCategoryArticles = useMemo(
    () => categoryArticles.filter(a => a.id !== article?.id),
    [categoryArticles, article?.id]
  );

  // Sort sentences by position
  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) return [];
    return [...article.article_sentences].sort((a, b) => a.position - b.position);
  }, [article?.article_sentences]);

  // Pre-process and sort words for all sentences
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

  // Handle article press
  const handleArticlePress = useCallback((articleId: number) => {
    router.push({
      pathname: '/article/[id]',
      params: { id: articleId },
    });
  }, []);

  // Render article card
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

  // Create animated style for back button
  const backButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: backButtonAnim.value }],
    };
  });

  // Memoize the playlist button component
  const PlaylistButton = useMemo(() => {
    if (!user) return null;

    return (
      <Animated.View style={[styles.playlistButton, { top: insets.top + LAYOUT.SPACING.MEDIUM }]}>
        <TouchableOpacity
          onPress={handleToggleReadingList}
          accessibilityLabel={isInReadingList ? 'Remove from playlist' : 'Add to playlist'}
          accessibilityRole="button"
        >
          <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={styles.buttonBlur}>
            <Ionicons
              name={isInReadingList ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isInReadingList ? colors.tint : colors.text}
              style={styles.buttonIcon}
            />
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [
    insets.top,
    isDarkMode,
    colors.text,
    colors.tint,
    isInReadingList,
    handleToggleReadingList,
    user,
  ]);

  // Optimize enhanceWord function - restore required properties for type compatibility
  const enhanceWord = useCallback((word: Tables<'sentence_words'>) => {
    return {
      ...word,
      root: null,
      word_type: null,
    };
  }, []);

  // Render word with enhanced visibility for study words
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
    [handleWordPress, selectedWordIds, settings.fontScale, enhanceWord]
  );

  // Optimized sentence renderer for FlatList
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
        />
      );
    },
    [sentenceWordsMap, renderWord, settings, colors]
  );

  // Footer component for related articles
  const ListFooterComponent = useCallback(() => {
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

  // Calculate content padding based on safe area insets
  const contentPadding = useMemo(
    () => ({
      paddingTop: insets.top + (Platform.OS === 'ios' ? 70 : 65),
      paddingBottom: 4,
    }),
    [insets.top]
  );

  // Simplify the scroll handling logic
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;

    if (Math.abs(currentScrollY - prevScrollYValue.current) < SCROLL_THRESHOLD) {
      // Skip small movements to reduce unnecessary state updates
      return;
    }

    // Show button when scrolling up or at top, hide when scrolling down
    setIsBackButtonVisible(currentScrollY < prevScrollYValue.current || currentScrollY <= 0);

    prevScrollYValue.current = currentScrollY;
  }, []);

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
      <StatusBar hidden />

      {/* Animated back button */}
      <Animated.View
        style={[
          styles.backButtonContainer,
          { top: insets.top + LAYOUT.SPACING.MEDIUM },
          backButtonAnimatedStyle,
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>

      {/* Animated playlist button */}
      {PlaylistButton}

      {/* Article content */}
      <FlatList
        data={sortedSentences}
        renderItem={renderSentenceItem}
        keyExtractor={item => item.id.toString()}
        style={styles.content}
        contentContainerStyle={[styles.sentenceList, contentPadding]}
        showsVerticalScrollIndicator={true}
        indicatorStyle={isDarkMode ? 'white' : 'black'}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        getItemLayout={(_data, index) => ({
          length: 80, // approximate height of each item
          offset: 80 * index,
          index,
        })}
        ListFooterComponent={ListFooterComponent}
        onEndReachedThreshold={0.5}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      />
    </ThemedView>
  );
}
