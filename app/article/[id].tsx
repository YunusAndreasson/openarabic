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
import Animated from 'react-native-reanimated';
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
import { useFadeInAnimation, useFloatingButtonAnimation } from '@/hooks/animations';
import { useArticleData } from '@/hooks/useArticleData';
import { useArticleMutations } from '@/hooks/useArticleMutations';
import { useArticleRenderers } from '@/hooks/useArticleRenderers';

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

  // Animation state
  const [isButtonsVisible, setIsButtonsVisible] = useState(true);
  const prevScrollYValue = useRef(0);

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Use the custom article data hook
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
  } = useArticleData(articleId, user?.id);

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
    useFadeInAnimation(0, 300);

  // Use the floating button animation hook from animations directory
  const { combinedBackButtonStyle, combinedBookmarkButtonStyle } =
    useFloatingButtonAnimation(isButtonsVisible);

  // Animation styles - these are now directly from the hooks
  const contentPadding = useMemo(
    () => ({
      paddingTop: insets.top + (Platform.OS === 'ios' ? 70 : 65),
      paddingBottom: 4,
      backgroundColor: 'transparent',
    }),
    [insets.top]
  );

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
        onPress={() => handleArticlePress(articleData.id)}
      />
    ),
    [handleArticlePress]
  );

  // Effects
  // Content animation when article is loaded
  useEffect(() => {
    if (!isLoadingArticle && article) {
      setIsLoading(false);
      startContentAnimation();
    }
  }, [isLoadingArticle, article, startContentAnimation]);

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
          animatedStyle={combinedBookmarkButtonStyle}
          onPress={() => handleToggleReadingList(articleId, isInReadingList)}
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
            ListFooterComponent={
              <RelatedArticlesFooter
                otherArticles={otherArticles}
                otherCategoryArticles={otherCategoryArticles}
                article={article}
                renderArticleCard={renderArticleCard}
              />
            }
            {...flatListConfig}
          />
        </Animated.View>
      </View>
    </ThemedView>
  );
}
