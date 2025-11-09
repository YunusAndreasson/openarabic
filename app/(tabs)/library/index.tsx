import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ArticleList } from '@/components/library';
import { BrandFooter } from '@/components/library';
import { FilterSection } from '@/components/library';
import { IntelligentArticleSection } from '@/components/library';
import { LAYOUT } from '@/constants/layout';
import { articleQueries, readingProgressQueries } from '@/constants/queries';
import { getAuthorFilterRoute, getCategoryFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import type { AuthorId, CategoryId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  headerContainer: {
    gap: LAYOUT.SPACING.SMALL, // Same as Practice screen (8px)
  },
  listContentContainer: LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
});

/**
 * Generic helper to build entities (categories/authors) with article counts
 * Filters out entities with no articles (count === 0)
 */
function buildEntitiesWithCounts<T extends { id: number; name: string }>(
  entities: T[],
  counts: Record<number, number>,
): (T & { count: number })[] {
  return entities.reduce<(T & { count: number })[]>((acc, entity) => {
    if (entity?.id && entity.id > 0 && entity.name) {
      const count = counts[entity.id] || 0;
      if (count > 0) {
        acc.push({ ...entity, count });
      }
    }
    return acc;
  }, []);
}

export default function ReadScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Scroll position preservation refs
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef<number>(0);
  const isRestoringScrollRef = useRef<boolean>(false);

  const { data: categoriesData = [], isLoading: isCategoriesLoading } = useQuery(
    articleQueries.categories(),
  );

  const { data: authorsData = [], isLoading: isAuthorsLoading } = useQuery(
    articleQueries.authors(),
  );

  // Get articles for display and filtering
  const { data: articlesData = [], isLoading: isArticlesLoading } = useQuery({
    ...articleQueries.all(),
    refetchOnMount: false, // Don't refetch on mount if we have data
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Track scroll position to preserve it across data updates
  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    // Don't track scroll position while restoring
    if (!isRestoringScrollRef.current) {
      scrollPositionRef.current = event.nativeEvent.contentOffset.y;
    }
  }, []);

  // Restore scroll position when articles data changes (re-sorts after completion)
  useEffect(() => {
    if (articlesData.length > 0 && scrollPositionRef.current > 0) {
      // Use setTimeout to ensure DOM has updated after re-render
      setTimeout(() => {
        isRestoringScrollRef.current = true;
        scrollViewRef.current?.scrollTo({
          y: scrollPositionRef.current,
          animated: false,
        });
        // Reset flag after scroll completes
        setTimeout(() => {
          isRestoringScrollRef.current = false;
        }, 100);
      }, 50);
    }
  }, [articlesData]);

  // Note: Categories are prioritized over authors since IDs overlap and categories are primary navigation

  // OPTIMIZED: Single-pass count calculation for both categories and authors (O(n) instead of O(2n))
  const { categoryCounts, authorCounts } = useMemo(() => {
    return articlesData.reduce<{
      categoryCounts: Record<number, number>;
      authorCounts: Record<number, number>;
    }>(
      (acc, article) => {
        const categoryId = article?.category?.id;
        const authorId = article?.author?.id;

        if (categoryId) {
          acc.categoryCounts[categoryId] = (acc.categoryCounts[categoryId] || 0) + 1;
        }
        if (authorId) {
          acc.authorCounts[authorId] = (acc.authorCounts[authorId] || 0) + 1;
        }

        return acc;
      },
      { categoryCounts: {}, authorCounts: {} },
    );
  }, [articlesData]);

  // Build categories list with counts
  const categoriesWithArticles = useMemo(
    () => buildEntitiesWithCounts(categoriesData, categoryCounts),
    [categoriesData, categoryCounts],
  );

  // Build authors list with counts
  const authorsWithArticles = useMemo(
    () => buildEntitiesWithCounts(authorsData, authorCounts),
    [authorsData, authorCounts],
  );

  // Note: We're now rendering regular categories and Continue Reading category separately

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      // Force complete cache invalidation for immediate data update using helpers
      const baseQueries = articleQueries.invalidateAll(queryClient);

      // Add user-specific queries if authenticated
      const userQueries = user?.id
        ? readingProgressQueries.invalidateAll(queryClient, user.id)
        : Promise.resolve();

      // Execute all invalidations with error handling for individual failures
      await Promise.allSettled([baseQueries, userQueries]);

      // Force new article selection only if refresh was successful
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(STRINGS.REFRESH_FAILED));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id]);

  // Note: Article navigation is now handled by Link components in ArticleCard

  const handleSelectFilter = useCallback(
    (id: number, _name?: string, filterType?: string) => {
      if (filterType === 'category') {
        const category = categoriesData.find(c => c.id === id);
        if (category) {
          router.push(getCategoryFilterRoute(id as CategoryId, category.name));
        }
      } else if (filterType === 'author') {
        const author = authorsData.find(a => a.id === id);
        if (author) {
          router.push(getAuthorFilterRoute(id as AuthorId, author.name));
        }
      }
    },
    [categoriesData, authorsData],
  );

  // Optimized header component - memoize individual sections
  const headerSections = useMemo(() => {
    const sections = [];

    if (articlesData.length > 0) {
      sections.push(
        <IntelligentArticleSection
          key="featured"
          articlesData={articlesData}
          refreshKey={refreshKey}
        />,
      );
    }

    if (categoriesWithArticles.length > 0) {
      sections.push(
        <FilterSection
          key="categories"
          items={categoriesWithArticles}
          onSelect={handleSelectFilter}
          filterType="category"
        />,
      );
    }

    if (authorsWithArticles.length > 0) {
      sections.push(
        <FilterSection
          key="authors"
          items={authorsWithArticles}
          onSelect={handleSelectFilter}
          filterType="author"
        />,
      );
    }

    return sections;
  }, [articlesData, refreshKey, categoriesWithArticles, authorsWithArticles]);

  const ListHeaderComponent = useMemo(
    () => <View style={styles.headerContainer}>{headerSections}</View>,
    [headerSections],
  );

  const ListFooterComponent = useMemo(() => <BrandFooter />, []);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      paddingTop: 0,
      paddingBottom: insets.bottom,
    }),
    [insets.bottom],
  );

  const isLoading = isArticlesLoading || isCategoriesLoading || isAuthorsLoading;

  if (isLoading && !articlesData.length && !categoriesData.length && !authorsData.length) {
    // Show loading state - handled by ArticleList
  }

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ArticleList
        ref={scrollViewRef}
        contentContainerStyle={contentContainerStyle}
        isRefreshing={isRefreshing}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        progressViewOffset={LAYOUT.SPACING.XLARGE}
        onRefresh={handleRefresh}
        onScroll={handleScroll}
      />
    </ThemedView>
  );
}

// Let parent _layout.tsx stack handle header; no local options needed.
export const options: NativeStackNavigationOptions = {
  headerShown: false,
};
