// Move content from the existing index.tsx file here

import { useHeaderHeight } from '@react-navigation/elements';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ErrorState from '@/components/ErrorState';
import { ThemedView } from '@/components/ThemedView';
import ArticleList from '@/components/home/ArticleList';
import FeaturedSection from '@/components/home/FeaturedSection';
import FilterSection from '@/components/home/FilterSection';
import { WelcomeMessage } from '@/components/home/WelcomeMessage';
import { LAYOUT } from '@/constants/layout';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { useAppDispatch } from '@/store/hooks';
import { updateLastOpenedArticle } from '@/store/readingListSlice';
import type { Article } from '@/types/articles.types';
import type { UserSession } from '@/types/auth.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { filterArticles, getBeginnerArticles } from '@/utils/articleUtils';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  listContentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

interface IntelligentArticleResult {
  article: Article | null;
  reason: string;
  type: 'due-words' | 'difficult-words' | 'beginner' | 'random';
}

function useIntelligentArticleSelection(
  user: UserSession['user'] | null,
  articlesData: Article[]
): IntelligentArticleResult & { dueWordRootIds: Set<number> } {
  const { hasEnoughArticles: hasDueWordArticles, dueWordRootIds } = useArticlesByDueWords(
    user?.id,
    10
  );

  const { hasEnoughArticles: hasDifficultWordArticles, difficultWordRootIds } =
    useArticlesByDifficultWords(user?.id, 10);

  const { data: allStudyWords = [] } = useQuery({
    queryKey: FSRS_QUERY_KEYS.all(user?.id || ''),
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(user.id, {
        forStats: true,
        limit: 1,
      });
    },
    enabled: !!user?.id,
    staleTime: 180000,
    gcTime: 600000,
  });

  const hasAnyStudyWords = allStudyWords.length > 0;

  return useMemo(() => {
    if (!articlesData.length) {
      return {
        article: null,
        reason: 'Loading articles...',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      };
    }

    // Strategy 1: If user has due words and enough articles with those words
    if (user?.id && hasDueWordArticles && dueWordRootIds.size > 0) {
      const dueWordArticles = articlesData.filter(article =>
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) =>
            dueWordRootIds.has(word.root_id)
          )
        )
      );

      if (dueWordArticles.length > 0) {
        const randomArticle =
          dueWordArticles[Math.floor(Math.random() * dueWordArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: 'Selected to help you practice words that are due for review',
          type: 'due-words',
          dueWordRootIds,
        };
      }
    }

    // Strategy 2: If user has difficult words and study progress
    if (user?.id && hasDifficultWordArticles && difficultWordRootIds.size > 0 && hasAnyStudyWords) {
      const difficultWordArticles = articlesData.filter(article =>
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) =>
            difficultWordRootIds.has(word.root_id)
          )
        )
      );

      if (difficultWordArticles.length > 0) {
        const randomArticle =
          difficultWordArticles[Math.floor(Math.random() * difficultWordArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: "Chosen to reinforce words you're finding challenging",
          type: 'difficult-words',
          dueWordRootIds,
        };
      }
    }

    // Strategy 3: If user has no study progress, show beginner content
    if (!user?.id || !hasAnyStudyWords) {
      const beginnerArticles = getBeginnerArticles(filterArticles(articlesData, null, null));

      if (beginnerArticles.length > 0) {
        const randomArticle =
          beginnerArticles[Math.floor(Math.random() * beginnerArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: 'Perfect for getting started with your reading journey',
          type: 'beginner',
          dueWordRootIds,
        };
      }
    }

    // Fallback: Random article
    const randomArticle = articlesData[Math.floor(Math.random() * articlesData.length)] ?? null;
    return {
      article: randomArticle,
      reason: 'Randomly selected for you to discover new content',
      type: 'random',
      dueWordRootIds,
    };
  }, [
    articlesData,
    user?.id,
    hasDueWordArticles,
    dueWordRootIds,
    hasDifficultWordArticles,
    difficultWordRootIds,
    hasAnyStudyWords,
  ]);
}

export default function ArticlesScreen(): JSX.Element {
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prefetchArticle } = useAppPreloader();

  const { data: categoriesData = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: 86400000,
    gcTime: 172800000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Get articles for display and filtering
  const { data: articlesData = [], isLoading: isArticlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: 3600000,
    gcTime: 7200000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const intelligentArticle = useIntelligentArticleSelection(user, articlesData);

  // Optimize article selection - only recalculate when needed
  const currentArticle = useMemo(() => {
    if (!articlesData.length) {
      return {
        article: null,
        reason: 'Loading articles...',
        type: 'random' as const,
        dueWordRootIds: new Set<number>(),
      };
    }

    // For refresh: pick a different random article
    if (refreshKey > 0 && intelligentArticle.article) {
      const availableArticles = articlesData.filter(
        article => article.id !== intelligentArticle.article?.id
      );

      if (availableArticles.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableArticles.length);
        const newArticle = availableArticles[randomIndex];

        return {
          ...intelligentArticle,
          article: newArticle,
          reason: 'New recommendation selected for you',
        };
      }
    }

    return intelligentArticle;
  }, [intelligentArticle, refreshKey, articlesData.length]);

  // Simplified derivedData - we know there will be data
  const categoriesWithArticles = useMemo(() => {
    if (!articlesData.length || !categoriesData.length) return [];

    const categoryIdsWithArticles = new Map<number, number>();

    articlesData.forEach(article => {
      if (article?.category?.id) {
        categoryIdsWithArticles.set(
          article.category.id,
          (categoryIdsWithArticles.get(article.category.id) || 0) + 1
        );
      }
    });

    return categoriesData
      .filter(category => category?.id && categoryIdsWithArticles.has(category.id))
      .map(category => ({
        ...category,
        count: categoryIdsWithArticles.get(category.id) || 0,
      }))
      .filter(category => category.id > 0 && category.name); // Additional safety for valid categories
  }, [articlesData, categoriesData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      const queriesToInvalidate: (string | readonly string[])[] = [['articles'], ['categories']];

      if (user?.id) {
        queriesToInvalidate.push(FSRS_QUERY_KEYS.due(user.id), FSRS_QUERY_KEYS.all(user.id));
      }

      await Promise.all(
        queriesToInvalidate.map(queryKey =>
          queryClient.invalidateQueries({
            queryKey: Array.isArray(queryKey) ? [...queryKey] : [queryKey],
          })
        )
      );

      // Force new article selection
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Refresh failed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      dispatch(updateLastOpenedArticle(article.id));
      prefetchArticle(article.id);
      router.push(
        `/(tabs)/read/article/${article.id}?headerTitle=${encodeURIComponent(article.title)}`
      );
    },
    [dispatch, prefetchArticle]
  );

  const handleSelectCategory = useCallback((categoryId: number, categoryName?: string) => {
    const url = categoryName
      ? `/(tabs)/read/filter?type=category&id=${categoryId}&name=${encodeURIComponent(categoryName)}`
      : `/(tabs)/read/filter?type=category&id=${categoryId}`;
    router.push(url);
  }, []);

  const calculateDueWordsForArticle = useCallback(
    (article: Article, dueWordRootIds: Set<number>): number => {
      if (!user?.id || !dueWordRootIds || dueWordRootIds.size === 0) return 0;

      const uniqueDueRootIds = new Set<number>();

      article.article_sentences?.forEach(sentence => {
        sentence.sentence_words?.forEach((word: SentenceWord) => {
          if (word.root_id && dueWordRootIds.has(word.root_id)) {
            uniqueDueRootIds.add(word.root_id);
          }
        });
      });

      return uniqueDueRootIds.size;
    },
    [user?.id]
  );

  // Pre-calculate due words count to avoid expensive computation in render
  const dueWordsCount = useMemo(() => {
    if (!currentArticle.article || !user?.id || !currentArticle.dueWordRootIds.size) return 0;

    return calculateDueWordsForArticle(currentArticle.article, currentArticle.dueWordRootIds);
  }, [
    currentArticle.article?.id,
    currentArticle.dueWordRootIds,
    user?.id,
    calculateDueWordsForArticle,
  ]);

  // Simplified header component
  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContainer}>
        {currentArticle.article && (
          <FeaturedSection
            article={currentArticle.article}
            dueWordCount={dueWordsCount > 0 ? dueWordsCount : undefined}
            onPress={handleArticlePress}
          />
        )}

        {categoriesWithArticles.length > 0 && (
          <FilterSection items={categoriesWithArticles} onSelect={handleSelectCategory} />
        )}
      </View>
    ),
    [
      currentArticle.article,
      dueWordsCount,
      handleArticlePress,
      categoriesWithArticles,
      handleSelectCategory,
    ]
  );

  // Remove unnecessary memoization for stable component
  const ListFooterComponent = <WelcomeMessage />;

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: headerHeight,
      paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
    }),
    [colors.background, headerHeight, insets.bottom]
  );

  // Simplified loading and error handling
  const isLoading = isArticlesLoading || isCategoriesLoading;
  const articlesQueryState = queryClient.getQueryState(['articles']);
  const hasArticlesError = articlesQueryState?.status === 'error';

  // Show error state only for actual errors, not loading states
  if (hasArticlesError && !isRefreshing && !isLoading) {
    return <ErrorState message="Unable to load articles" onRetry={handleRefresh} />;
  }

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ArticleList
        contentContainerStyle={contentContainerStyle}
        isRefreshing={isRefreshing}
        ListFooterComponent={ListFooterComponent}
        ListHeaderComponent={ListHeaderComponent}
        progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
        onArticlePress={handleArticlePress}
        onRefresh={handleRefresh}
      />
    </ThemedView>
  );
}

export function useArticlesAndDueWordsLoaded() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const articlesQueryState = queryClient.getQueryState(['articles']);
  const articlesLoaded =
    articlesQueryState?.status === 'success' || articlesQueryState?.status === 'error';

  const { isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 10);

  return useMemo(() => {
    if (!user?.id) return articlesLoaded;
    return articlesLoaded && !isDueWordsLoading;
  }, [articlesLoaded, isDueWordsLoading, user?.id]);
}
