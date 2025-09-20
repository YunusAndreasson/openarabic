import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import BottomControls from '@/components/bookmarks/BottomControls';
import ArticleList from '@/components/library/ArticleList';
import FilterSection from '@/components/library/FilterSection';
import { HijriDateFooter } from '@/components/library/HijriDateFooter';
import IntelligentArticleSection from '@/components/library/IntelligentArticleSection';
import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { CACHE_TIMES } from '@/constants/queryConfig';
import { getArticleRoute, getCategoryFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useLastReadArticle } from '@/hooks/articles/useLastReadArticle';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import type { Category } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback, selectionFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  headerContainer: {
    // No margin needed - content should be directly under header
  },
  listContentContainer: LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
});

export default function ReadScreen(): JSX.Element {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prefetchArticle } = useAppPreloader();

  // Get last read article for continue reading button
  const { showButton, isLoading: isLastReadLoading, continueReadingData } = useLastReadArticle();

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

  // Optimized articlesData - memoize to prevent unnecessary re-renders
  const memoizedArticlesData = useMemo(
    () => articlesData,
    [
      // Only depend on articlesData itself, not individual properties
      // This creates a stable reference unless the actual array changes
      articlesData,
    ]
  );

  // Optimized derivedData - use stable references when possible
  const categoriesWithArticles = useMemo(() => {
    const counts = memoizedArticlesData.reduce<Record<number, number>>((acc, article) => {
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
  }, [memoizedArticlesData, categoriesData]); // Use memoized articles data

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      // Force complete cache invalidation for immediate data update
      const baseQueries = [
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
      ];

      // Add user-specific queries if authenticated
      const userQueries = user?.id
        ? [
            queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) }),
            queryClient.invalidateQueries({
              queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
            }),
            queryClient.invalidateQueries({ queryKey: ['reading-streak', user.id] }),
            queryClient.invalidateQueries({ queryKey: ['reading-list', user.id] }),
            queryClient.invalidateQueries({ queryKey: ['last-read-article', user.id] }),
          ]
        : [];

      // Execute all invalidations with error handling for individual failures
      const allQueries = [...baseQueries, ...userQueries];
      await Promise.allSettled(allQueries);

      // Force new article selection only if refresh was successful
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(STRINGS.REFRESH_FAILED));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id]);

  // Note: Article navigation is now handled by Link components in ArticleCard

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      const categoryName = categoriesData.find(c => c.id === categoryId)?.name;
      router.push(getCategoryFilterRoute(categoryId, categoryName));
    },
    [categoriesData]
  );

  const handleContinueReading = useCallback(() => {
    if (!continueReadingData?.article) return;

    selectionFeedback();
    // Prefetch article data after navigation animation completes
    InteractionManager.runAfterInteractions(() => {
      prefetchArticle(continueReadingData.article.id);
    });
    router.push(getArticleRoute(continueReadingData.article.id, continueReadingData.article.title));
  }, [continueReadingData, prefetchArticle]);

  // Optimized header component - minimize re-creation by memoizing stable parts
  const ListHeaderComponent = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <IntelligentArticleSection articlesData={memoizedArticlesData} refreshKey={refreshKey} />
        <FilterSection items={categoriesWithArticles} onSelect={handleSelectCategory} />
      </View>
    );
  }, [
    memoizedArticlesData, // Use memoized articles data to prevent unnecessary re-renders
    refreshKey, // Only changes on manual refresh
    categoriesWithArticles, // Computed value, changes when articles/categories change
    handleSelectCategory, // Stable callback
  ]);

  // Static footer component - no props needed
  const ListFooterComponent = useMemo(() => <HijriDateFooter />, []);

  // Button text - always "Continue Reading" since we only show articles user has actually read or bookmarked
  const continueButtonText = useMemo(() => {
    return STRINGS.CONTINUE_READING;
  }, []);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: 0,
      paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
    }),
    [colors, insets.bottom]
  );

  const isLoading = isArticlesLoading || isCategoriesLoading;

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
        progressViewOffset={LAYOUT.SPACING.XLARGE}
        onRefresh={handleRefresh}
      />

      {/* Bottom fixed CONTINUE READING button, shown immediately when progress loads */}
      {showButton && (
        <View
          style={{
            position: 'absolute',
            bottom:
              LAYOUT.BOTTOM_BAR.HEIGHT +
              LAYOUT.SPACING.TINY -
              LAYOUT.SPACING.MEDIUM -
              LAYOUT.SPACING.SMALL,
            left: 0,
            right: 0,
          }}
        >
          <BottomControls
            primaryLabel={continueButtonText}
            onPrimaryPress={handleContinueReading}
            primaryDisabled={!continueReadingData} // Disable until we have any type of article data
            primaryLoading={isLastReadLoading && !continueReadingData} // Show loading while article data loads
          />
        </View>
      )}
    </ThemedView>
  );
}

// Let parent _layout.tsx stack handle header; no local options needed.
export const options: NativeStackNavigationOptions = {
  headerShown: false,
};
