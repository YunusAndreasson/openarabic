import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ArticleList from '@read/ArticleList';
import FilterSection from '@read/FilterSection';
import { HijriDateFooter } from '@read/HijriDateFooter';
import IntelligentArticleSection from '@read/IntelligentArticleSection';

import { ThemedView } from '@/components/ThemedView';
import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { CACHE_TIMES } from '@/constants/queryConfig';
import { getArticleRoute, getCategoryFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
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
    ...CACHE_TIMES.ARTICLES,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Optimized derivedData - use stable references when possible
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
  }, [articlesData, categoriesData]); // Keep full dependencies but optimize the arrays themselves

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      // Force complete cache invalidation for immediate data update
      const refreshPromises = [
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
      ];

      // Add user-specific queries if authenticated
      if (user?.id) {
        refreshPromises.push(
          queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) }),
          queryClient.invalidateQueries({
            queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
          }),
          queryClient.invalidateQueries({ queryKey: ['reading-streak', user.id] })
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
      // Prefetch article data after navigation animation completes
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(article.id);
      });
      router.push(getArticleRoute(article.id, article.title));
    },
    [prefetchArticle]
  );

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      const categoryName = categoriesData.find(c => c.id === categoryId)?.name;
      router.push(getCategoryFilterRoute(categoryId, categoryName));
    },
    [categoriesData]
  );

  // Optimized header component - minimize re-creation by memoizing stable parts
  const ListHeaderComponent = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <IntelligentArticleSection
          articlesData={articlesData}
          refreshKey={refreshKey}
          onArticlePress={handleArticlePress}
        />
        <FilterSection items={categoriesWithArticles} onSelect={handleSelectCategory} />
      </View>
    );
  }, [
    articlesData, // Articles data changes less frequently than other values
    refreshKey, // Only changes on manual refresh
    handleArticlePress, // Stable callback
    categoriesWithArticles, // Computed value, changes when articles/categories change
    handleSelectCategory, // Stable callback
  ]);

  // Static footer component - no props needed
  const ListFooterComponent = useMemo(() => <HijriDateFooter />, []);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: headerHeight,
      paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
    }),
    [colors, headerHeight, insets.bottom] // Use entire colors object to reduce individual property dependencies
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
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
        onArticlePress={handleArticlePress}
        onRefresh={handleRefresh}
      />
    </ThemedView>
  );
}

// Let parent _layout.tsx stack handle header; no local options needed.
export const options: NativeStackNavigationOptions = {
  headerShown: false,
};
