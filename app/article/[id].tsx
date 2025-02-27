import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, View, FlatList } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { articlesService } from '@/services/articles';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAppSelector } from '@/store/hooks';
import { CollapsibleHeader } from '@/components/CollapsibleHeader';
import { ArabicWord } from '@/components/ArabicWord';
import type { Tables } from '@/types/database.types';
import { studyWordsService } from '@/services/study_words';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import { LAYOUT } from '@/constants/layout';
import { Loader, LoadingScreen } from '@/components/Loader';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { ArticleSentence } from '@/components/ArticleSentence';
import { RelatedArticlesSection } from '@/components/RelatedArticlesSection';
import { ArticleHeader } from '@/components/ArticleHeader';
import type { Article } from '@/types/articles.types';
import { Image } from 'expo-image';
import { CategoryPill } from '@/components/CategoryPill';
import { AudioPlayButton } from '@/components/AudioPlayButton';
import { ReadingListButton } from '@/components/ReadingListButton';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  sentenceList: {
    paddingBottom: LAYOUT.SPACING.XXLARGE,
  },
  relatedArticlesContainer: {
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  headerContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: 0,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    backgroundColor: 'transparent',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    textAlign: 'left',
    marginBottom: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  buttonWrapper: {
    flex: 1,
  },
  textShadow: {
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Optimize image loading with proper error handling
  const handleImageError = useCallback(() => {
    console.warn('Error loading article image, falling back to default');
    setIsImageLoading(false);
    setIsInitialLoad(false);
  }, []);

  // Memoize the image source to prevent unnecessary re-renders
  const imageSource = useMemo(() => {
    return require('@/assets/images/default-header.jpg');
  }, []);

  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesService.getArticleById(articleId!),
    enabled: !!articleId,
  });

  // Reset image loading state when article changes
  useEffect(() => {
    if (article) {
      setIsImageLoading(true);

      // Preload default image when article data is available
      const preloadDefaultImage = async () => {
        try {
          const defaultImage = require('@/assets/images/default-header.jpg');
          await Image.prefetch(defaultImage);
        } catch (error) {
          console.error('Error preloading default image:', error);
        } finally {
          // Even if there's an error, we should still hide the loading screen
          setIsImageLoading(false);
          setIsInitialLoad(false);
        }
      };

      preloadDefaultImage();
    }
  }, [article?.id]);

  const { data: studyWords = [] } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id),
    enabled: !!user,
  });

  const selectedWordIds = useMemo(
    () => new Set(studyWords.map(w => w.sentence_word_id)),
    [studyWords]
  );

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

  const handleWordPress = useCallback(
    async (word: Tables<'sentence_words'>) => {
      if (!user) return;
      toggleWordMutation.mutate({ userId: user.id, wordId: word.id });
    },
    [user, toggleWordMutation]
  );

  const { data: moreArticles = [] } = useQuery({
    queryKey: ['articles', 'author', article?.author?.id],
    queryFn: () => articlesService.getArticles(undefined, article!.author!.id),
    enabled: !!article?.author?.id,
  });

  const otherArticles = useMemo(
    () => moreArticles.filter(a => a.id !== article?.id),
    [moreArticles, article?.id]
  );

  const { data: categoryArticles = [] } = useQuery({
    queryKey: ['articles', 'category', article?.category?.id],
    queryFn: () => articlesService.getArticles(article!.category!.id),
    enabled: !!article?.category?.id,
  });

  const otherCategoryArticles = useMemo(
    () => categoryArticles.filter(a => a.id !== article?.id),
    [categoryArticles, article?.id]
  );

  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) return [];
    return [...article.article_sentences].sort((a, b) => a.position - b.position);
  }, [article?.article_sentences]);

  // Pre-process and sort words for all sentences to avoid sorting in the render phase
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

  const handleArticlePress = useCallback((articleId: number) => {
    router.push({
      pathname: '/article/[id]',
      params: { id: articleId },
    });
  }, []);

  // Enhanced text shadow style with stronger shadow for light mode
  const textShadowStyle = useMemo(() => {
    return isDarkMode
      ? {
          textShadowColor: colors.textShadowDark,
        }
      : null;
  }, [colors.textShadowDark, isDarkMode]);

  // Always use black text for title and author in light mode
  const headerTextColor = useMemo(
    () => (isDarkMode ? colors.white : '#000000'),
    [isDarkMode, colors.white]
  );

  const renderHeaderContent = useCallback(
    () => (
      <View style={styles.headerContent}>
        <ArticleHeader
          article={article || null}
          headerTextColor={headerTextColor}
          isDarkMode={isDarkMode}
          textShadowStyle={textShadowStyle}
        />
      </View>
    ),
    [article, textShadowStyle, headerTextColor, isDarkMode, styles.headerContent]
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

  // Manually add the missing properties to make the word compatible with WordWithDetails type
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

  // Determine if we should show the loading screen
  const isLoading = isLoadingArticle || (isInitialLoad && isImageLoading);

  if (isInitialLoad || isLoadingArticle) {
    return <LoadingScreen />;
  }

  if (!article) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Article not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <CollapsibleHeader
      title={article.title || ''}
      imageSource={imageSource}
      accessibilityLabel={article.title || 'Article'}
      onImageLoaded={() => {
        setIsImageLoading(false);
        setIsInitialLoad(false);
      }}
      renderContent={renderHeaderContent}
    >
      <FlatList
        data={sortedSentences}
        renderItem={renderSentenceItem}
        keyExtractor={item => item.id.toString()}
        style={styles.content}
        contentContainerStyle={styles.sentenceList}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: 80, // approximate height of each item
          offset: 80 * index,
          index,
        })}
        ListFooterComponent={ListFooterComponent}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        onEndReachedThreshold={0.5}
        scrollEventThrottle={16}
      />
    </CollapsibleHeader>
  );
}
