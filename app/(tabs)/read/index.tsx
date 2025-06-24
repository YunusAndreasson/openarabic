import { useHeaderHeight } from '@react-navigation/elements';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ErrorState from '@/components/ErrorState';
import { ThemedView } from '@/components/ThemedView';
import ArticleList from '@/components/home/ArticleList';
import FilterSection from '@/components/home/FilterSection';
import IntelligentArticleSection from '@/components/home/IntelligentArticleSection';
import WelcomeMessage from '@/components/home/WelcomeMessage';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { getArticleRoute, getFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useBookmarks } from '@/hooks/articles/useBookmarks';
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
  bookmarksDivider: {
    height: 1,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    marginTop: LAYOUT.SPACING.MEDIUM,
    opacity: 0.3,
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
  const { bookmarkCount } = useBookmarks();

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
          queryClient.refetchQueries({ queryKey: ['bookmark-count', user.id] }),
          queryClient.refetchQueries({ queryKey: ['bookmarked-articles', user.id] })
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

  const handleSelectBookmarks = useCallback(() => {
    router.push(getFilterRoute('bookmark', 'bookmarks', STRINGS.BOOKMARKS));
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

        {/* Bookmarks section with subtle divider */}
        {user?.id && bookmarkCount > 0 && (
          <>
            <View style={[styles.bookmarksDivider, { backgroundColor: colors.border }]} />
            <FilterSection
              items={[
                {
                  id: 0,
                  name: STRINGS.BOOKMARKS,
                  count: bookmarkCount,
                },
              ]}
              onSelect={handleSelectBookmarks}
            />
          </>
        )}
      </View>
    ),
    [
      articlesData,
      refreshKey,
      handleArticlePress,
      categoriesWithArticles,
      handleSelectCategory,
      user?.id,
      colors.border,
      bookmarkCount,
      handleSelectBookmarks,
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

  // Show error state only for actual errors, not loading states, and not during refresh
  if (
    (isArticlesLoading && !articlesData.length) ||
    (isCategoriesLoading && !categoriesData.length)
  ) {
    // Show loading state - handled by ArticleList
  } else if (!isLoading && !isRefreshing && !articlesData.length) {
    return <ErrorState message={STRINGS.UNABLE_TO_LOAD_ARTICLES} onRetry={handleRefresh} />;
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
