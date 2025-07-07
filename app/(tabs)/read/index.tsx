import { useHeaderHeight } from '@react-navigation/elements';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import ArticleList from '@/components/home/ArticleList';
import FilterSection from '@/components/home/FilterSection';
import { HijriDateFooter } from '@/components/home/HijriDateFooter';
import IntelligentArticleSection from '@/components/home/IntelligentArticleSection';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { getArticleRoute, getFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { useAppDispatch } from '@/store/hooks';
import { updateLastOpenedArticle } from '@/store/readingListSlice';
import type { Article, Category } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  listContentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

export default function ReadScreen(): JSX.Element {
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

  // Simplified derivedData - articles are guaranteed to exist
  const categoriesWithArticles = useMemo(() => {
    const counts = articlesData.reduce<Record<number, number>>((acc, article) => {
      const id = article?.category?.id;
      if (id) {
        acc[id] = (acc[id] || 0) + 1;
      }
      return acc;
    }, {});

    return categoriesData.reduce<(Category & { count: number })[]>((acc, category) => {
      if (category?.id && category.id > 0 && category.name) {
        const count = counts[category.id] || 0;
        if (count > 0) {
          acc.push({ ...category, count });
        }
      }
      return acc;
    }, []);
  }, [articlesData, categoriesData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      // Refetch core queries explicitly for immediate data update
      const refreshPromises = [
        queryClient.refetchQueries({ queryKey: ['articles'] }),
        queryClient.refetchQueries({ queryKey: ['categories'] }),
      ];

      // Add user-specific queries if authenticated
      if (user?.id) {
        refreshPromises.push(
          queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) }),
          queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) }),
          queryClient.refetchQueries({ queryKey: ['reading-streak', user.id] })
        );
      }

      await Promise.all(refreshPromises);

      // Force new article selection
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(STRINGS.REFRESH_FAILED));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      dispatch(updateLastOpenedArticle(article.id));
      // Prefetch article data after navigation animation completes
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(article.id);
      });
      router.push(getArticleRoute(article.id, article.title));
    },
    [dispatch, prefetchArticle]
  );

  const handleSelectCategory = useCallback((categoryId: number, categoryName?: string) => {
    router.push(getFilterRoute('category', categoryId, categoryName));
  }, []);

  // Simplified header component - categories are guaranteed to have articles
  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <IntelligentArticleSection
          articlesData={articlesData}
          refreshKey={refreshKey}
          onArticlePress={handleArticlePress}
        />

        <FilterSection items={categoriesWithArticles} onSelect={handleSelectCategory} />
      </View>
    ),
    [articlesData, refreshKey, handleArticlePress, categoriesWithArticles, handleSelectCategory]
  );

  // Remove unnecessary memoization for stable component
  const ListFooterComponent = useMemo(() => <HijriDateFooter />, []);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: headerHeight,
      paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
    }),
    [colors.background, headerHeight, insets.bottom]
  );

  // Simplified loading and error handling - articles are guaranteed to exist
  const isLoading = isArticlesLoading || isCategoriesLoading;

  // Only show loading state, not error states for missing data
  if (isLoading && !articlesData.length && !categoriesData.length) {
    // Show loading state - handled by ArticleList
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
