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
import FilterSection from '@/components/home/FilterSection';
import IntelligentArticleSection from '@/components/home/IntelligentArticleSection';
import { WelcomeMessage } from '@/components/home/WelcomeMessage';
import { LAYOUT } from '@/constants/layout';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { useAppDispatch } from '@/store/hooks';
import { updateLastOpenedArticle } from '@/store/readingListSlice';
import type { Article } from '@/types/articles.types';
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

  // Simplified header component
  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <IntelligentArticleSection
          articlesData={articlesData}
          refreshKey={refreshKey}
          onArticlePress={handleArticlePress}
        />

        {categoriesWithArticles.length > 0 && (
          <FilterSection items={categoriesWithArticles} onSelect={handleSelectCategory} />
        )}
      </View>
    ),
    [articlesData, refreshKey, handleArticlePress, categoriesWithArticles, handleSelectCategory]
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
