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
import BottomControls from '@/components/listen/BottomControls';
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
  const {
    lastReadArticle,
    hasLastReadArticle,
    showButton,
    isLoading: isLastReadLoading,
  } = useLastReadArticle();

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

  // Note: Article navigation is now handled by Link components in ArticleCard

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      const categoryName = categoriesData.find(c => c.id === categoryId)?.name;
      router.push(getCategoryFilterRoute(categoryId, categoryName));
    },
    [categoriesData]
  );

  const handleContinueReading = useCallback(() => {
    if (!lastReadArticle) return;

    selectionFeedback();
    // Prefetch article data after navigation animation completes
    InteractionManager.runAfterInteractions(() => {
      prefetchArticle(lastReadArticle.id);
    });
    router.push(getArticleRoute(lastReadArticle.id, lastReadArticle.title));
  }, [lastReadArticle, prefetchArticle]);

  // Optimized header component - minimize re-creation by memoizing stable parts
  const ListHeaderComponent = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <IntelligentArticleSection articlesData={articlesData} refreshKey={refreshKey} />
        <FilterSection items={categoriesWithArticles} onSelect={handleSelectCategory} />
      </View>
    );
  }, [
    articlesData, // Articles data changes less frequently than other values
    refreshKey, // Only changes on manual refresh
    categoriesWithArticles, // Computed value, changes when articles/categories change
    handleSelectCategory, // Stable callback
  ]);

  // Static footer component - no props needed
  const ListFooterComponent = useMemo(() => <HijriDateFooter />, []);

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
            primaryLabel={STRINGS.CONTINUE_READING}
            onPrimaryPress={handleContinueReading}
            primaryDisabled={!hasLastReadArticle} // Disable until article data is fully loaded
            primaryLoading={isLastReadLoading && !hasLastReadArticle} // Show loading while article data loads
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
