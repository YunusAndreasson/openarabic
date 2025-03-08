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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import { articlesService } from '@/services/articles';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
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
import { addToReadingList, incrementReadCount } from '@/store/readingListSlice';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

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
    overflow: 'hidden',
  },
  playlistButton: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    right: 15,
    overflow: 'hidden',
  },
  buttonBlur: {
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    alignSelf: 'center',
  },
  // Article header styles
  articleHeaderContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.XLARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.3,
  },
  articleMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorName: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    marginLeft: LAYOUT.SPACING.TINY,
  },
  articleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleInfoText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginLeft: LAYOUT.SPACING.TINY,
    opacity: 0.7,
  },
  categoryContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: 16,
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  categoryText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  summaryText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.6,
    opacity: 0.85,
    fontStyle: 'italic',
    paddingTop: LAYOUT.SPACING.SMALL,
  },
});

// Threshold for scroll direction detection
const SCROLL_THRESHOLD = 10;

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

  // Animation values for back button using Reanimated
  const backButtonAnim = useSharedValue(0);
  const playlistButtonAnim = useSharedValue(0);
  const buttonsOpacity = useSharedValue(1); // Add opacity shared value
  const [isButtonsVisible, setIsButtonsVisible] = useState(true);
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

  // Remove from reading list mutation
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
    // Use the same animation configuration for both buttons
    const config = {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    };

    // Move buttons completely off-screen when not visible
    // Use negative value that's larger than the button height to ensure it's completely hidden
    backButtonAnim.value = withTiming(isButtonsVisible ? 0 : -100, config);
    playlistButtonAnim.value = withTiming(isButtonsVisible ? 0 : -100, config);
    buttonsOpacity.value = withTiming(isButtonsVisible ? 1 : 0, config);
  }, [isButtonsVisible, backButtonAnim, playlistButtonAnim, buttonsOpacity]);

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
      opacity: buttonsOpacity.value,
    };
  });

  // Create animated style for playlist button
  const playlistButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: playlistButtonAnim.value }],
      opacity: buttonsOpacity.value,
    };
  });

  // Create themed styles with LAYOUT.OPACITY constants
  const themedStyles = useMemo(
    () => ({
      ...styles,
      buttonBlur: {
        ...styles.buttonBlur,
        opacity: LAYOUT.OPACITY.HOVER,
      },
    }),
    []
  );

  // Memoize the back button component to match playlist button implementation
  const BackButton = useMemo(() => {
    const buttonStyle = {
      ...themedStyles.buttonBlur,
      backgroundColor: isDarkMode
        ? `rgba(${parseInt(colors.background.slice(1, 3), 16)}, ${parseInt(colors.background.slice(3, 5), 16)}, ${parseInt(colors.background.slice(5, 7), 16)}, 0.8)`
        : `rgba(${parseInt(colors.background.slice(1, 3), 16)}, ${parseInt(colors.background.slice(3, 5), 16)}, ${parseInt(colors.background.slice(5, 7), 16)}, 0.8)`,
    };

    return (
      <Animated.View
        style={[
          styles.backButton,
          { top: insets.top + LAYOUT.SPACING.MEDIUM },
          backButtonAnimatedStyle,
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <BlurView intensity={90} tint={isDarkMode ? 'dark' : 'light'} style={buttonStyle}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDarkMode ? colors.white : colors.black}
              style={styles.buttonIcon}
            />
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [insets.top, isDarkMode, backButtonAnimatedStyle, colors]);

  // Memoize the playlist button component
  const PlaylistButton = useMemo(() => {
    if (!user) return null;

    const buttonStyle = {
      ...themedStyles.buttonBlur,
      backgroundColor: isDarkMode
        ? `rgba(${parseInt(colors.background.slice(1, 3), 16)}, ${parseInt(colors.background.slice(3, 5), 16)}, ${parseInt(colors.background.slice(5, 7), 16)}, 0.8)`
        : `rgba(${parseInt(colors.background.slice(1, 3), 16)}, ${parseInt(colors.background.slice(3, 5), 16)}, ${parseInt(colors.background.slice(5, 7), 16)}, 0.8)`,
    };

    // Use the default color for the headset icon
    const activeIconColor = isDarkMode ? colors.white : colors.black;
    const inactiveIconColor = isDarkMode ? colors.white : colors.black;

    return (
      <Animated.View
        style={[
          styles.playlistButton,
          { top: insets.top + LAYOUT.SPACING.MEDIUM },
          playlistButtonAnimatedStyle,
        ]}
      >
        <TouchableOpacity
          onPress={handleToggleReadingList}
          accessibilityLabel={isInReadingList ? 'Remove from bookmarks' : 'Add to bookmarks'}
          accessibilityRole="button"
        >
          <BlurView intensity={90} tint={isDarkMode ? 'dark' : 'light'} style={buttonStyle}>
            <Ionicons
              name={isInReadingList ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isInReadingList ? activeIconColor : inactiveIconColor}
              style={styles.buttonIcon}
            />
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [
    insets.top,
    isDarkMode,
    isInReadingList,
    handleToggleReadingList,
    user,
    playlistButtonAnimatedStyle,
    colors,
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
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;

      // Skip small movements to reduce unnecessary state updates
      if (Math.abs(currentScrollY - prevScrollYValue.current) < SCROLL_THRESHOLD) {
        return;
      }

      // Show buttons when scrolling up or at the very top, hide when scrolling down
      const isScrollingUp = currentScrollY < prevScrollYValue.current;
      const isAtTop = currentScrollY <= 0;

      // Only update state if it's changing to avoid unnecessary re-renders
      if (isButtonsVisible !== (isScrollingUp || isAtTop)) {
        setIsButtonsVisible(isScrollingUp || isAtTop);
      }

      prevScrollYValue.current = currentScrollY;
    },
    [isButtonsVisible]
  );

  // Add the article to the reading list when it's viewed
  useEffect(() => {
    if (id) {
      const articleId = parseInt(id as string, 10);
      if (!isNaN(articleId)) {
        try {
          // Only add to reading list if user is authenticated
          if (user) {
            // Add to reading list and increment read count
            dispatch(addToReadingList(articleId));
            dispatch(incrementReadCount(articleId));
          }
        } catch (error) {
          // Silently handle errors
        }
      }
    }
  }, [id, dispatch, user]);

  // Article Header Component
  const ArticleHeader = useMemo(() => {
    if (!article) return null;

    // Calculate reading time based on number of sentences (rough estimate)
    const readingTime = article.article_sentences?.length
      ? Math.max(1, Math.ceil(article.article_sentences.length / 10))
      : 3;

    // Capitalize first letter of category
    const categoryName = article.category?.name
      ? capitalizeFirstLetter(article.category.name)
      : 'Uncategorized';

    return (
      <View style={styles.articleHeaderContainer}>
        <ThemedText style={styles.articleTitle}>{article.title}</ThemedText>

        <View style={styles.articleMetaContainer}>
          <View style={styles.authorContainer}>
            <Ionicons name="person-circle-outline" size={20} color={colors.text} />
            <ThemedText style={styles.authorName}>
              {article.author?.name || 'Unknown Author'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.articleInfoContainer}>
          <View
            style={[
              styles.categoryContainer,
              {
                backgroundColor: `${colors.tint}15`,
                ...Platform.select({
                  ios: {
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                  },
                  android: {
                    elevation: 2,
                  },
                }),
              },
            ]}
          >
            <ThemedText style={[styles.categoryText, { color: colors.tint }]}>
              {categoryName}
            </ThemedText>
          </View>

          <View style={styles.articleInfoItem}>
            <Ionicons name="time-outline" size={16} color={colors.text} />
            <ThemedText style={styles.articleInfoText}>{readingTime} min read</ThemedText>
          </View>

          <View style={styles.articleInfoItem}>
            <Ionicons name="stats-chart-outline" size={16} color={colors.text} />
            <ThemedText style={styles.articleInfoText}>Level {article.difficulty_level}</ThemedText>
          </View>
        </View>

        {article.summary && <ThemedText style={styles.summaryText}>{article.summary}</ThemedText>}
      </View>
    );
  }, [article, colors]);

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
      {BackButton}

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
        ListHeaderComponent={ArticleHeader}
        ListFooterComponent={ListFooterComponent}
        onEndReachedThreshold={0.5}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      />
    </ThemedView>
  );
}
