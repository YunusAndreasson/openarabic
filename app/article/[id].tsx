import React, { useMemo, useCallback } from 'react';
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
import { Loader } from '@/components/Loader';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { ArticleSentence } from '@/components/ArticleSentence';
import { RelatedArticlesSection } from '@/components/RelatedArticlesSection';
import { ArticleHeader } from '@/components/ArticleHeader';
import type { Article } from '@/types/articles.types';

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
});

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();

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

  // Custom gradient colors for better readability in light mode
  const gradientColors = useMemo(() => {
    return isDarkMode
      ? (['transparent', colors.background] as const)
      : (['transparent', 'rgba(255, 255, 255, 0.8)', colors.background] as const); // Three-color gradient for light mode
  }, [colors.background, isDarkMode]);

  const renderHeaderContent = useCallback(
    () => (
      <ArticleHeader
        article={article || null}
        headerTextColor={headerTextColor}
        isDarkMode={isDarkMode}
        textShadowStyle={textShadowStyle}
      />
    ),
    [article, textShadowStyle, headerTextColor, isDarkMode]
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

  if (isLoadingArticle) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <Loader size="large" />
        </View>
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
    <CollapsibleHeader
      renderContent={renderHeaderContent}
      title={article.title || ''}
      customGradientColors={gradientColors}
    >
      <FlatList
        data={sortedSentences}
        renderItem={renderSentenceItem}
        keyExtractor={item => item.id.toString()}
        style={styles.content}
        contentContainerStyle={styles.sentenceList}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        ListFooterComponent={ListFooterComponent}
      />
    </CollapsibleHeader>
  );
}
