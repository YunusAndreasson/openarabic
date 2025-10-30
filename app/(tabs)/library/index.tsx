import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ArticleList } from '@/components/library/ArticleList';
import { FilterSection } from '@/components/library/FilterSection';
import { HijriDateFooter } from '@/components/library/HijriDateFooter';
import { IntelligentArticleSection } from '@/components/library/IntelligentArticleSection';
import { LAYOUT } from '@/constants/layout';
import { articleQueries, readingProgressQueries } from '@/constants/queries';
import { getAuthorFilterRoute, getCategoryFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import type { Author, Category } from '@/types/articles.types';
import type { AuthorId, CategoryId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  headerContainer: {
    // No margin needed - content should be directly under header
  },
  listContentContainer: LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
});

export default function ReadScreen(): JSX.Element {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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

  // Note: Categories are prioritized over authors since IDs overlap and categories are primary navigation

  // Optimized derivedData - use stable references when possible
  const categoriesWithArticles = useMemo(() => {
    const counts = articlesData.reduce<Record<number, number>>((acc, article) => {
      const id = article?.category?.id;
      if (id) {
        acc[id] = (acc[id] || 0) + 1;
      }
      return acc;
    }, {});

    const result = categoriesData.reduce<(Category & { count: number })[]>((acc, category) => {
      if (category?.id && category.id > 0 && category.name) {
        const count = counts[category.id] || 0;
        if (count > 0) {
          acc.push({ ...category, count });
        }
      }
      return acc;
    }, []);

    return result;
  }, [articlesData, categoriesData]);

  // Create authors with article counts
  const authorsWithArticles = useMemo(() => {
    const counts = articlesData.reduce<Record<number, number>>((acc, article) => {
      const id = article?.author?.id;
      if (id) {
        acc[id] = (acc[id] || 0) + 1;
      }
      return acc;
    }, {});

    const result = authorsData.reduce<(Author & { count: number })[]>((acc, author) => {
      if (author?.id && author.id > 0 && author.name) {
        const count = counts[author.id] || 0;
        if (count > 0) {
          acc.push({ ...author, count });
        }
      }
      return acc;
    }, []);

    return result;
  }, [articlesData, authorsData]);

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
      // Use explicit filterType if provided, otherwise determine by checking each data source
      if (filterType) {
        switch (filterType) {
          case 'category': {
            const category = categoriesData.find(c => c.id === id);
            if (category) {
              router.push(getCategoryFilterRoute(id as CategoryId, category.name));
              return;
            }
            break;
          }
          case 'author': {
            const author = authorsData.find(a => a.id === id);
            if (author) {
              router.push(getAuthorFilterRoute(id as AuthorId, author.name));
              return;
            }
            break;
          }
        }
      }

      // Fallback: Check in priority order
      // Check if it's a category
      const category = categoriesData.find(c => c.id === id);
      if (category) {
        router.push(getCategoryFilterRoute(id as CategoryId, category.name));
        return;
      }

      // Finally check if it's an author
      const author = authorsData.find(a => a.id === id);
      if (author) {
        router.push(getAuthorFilterRoute(id as AuthorId, author.name));
        return;
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

  // Static footer component - no props needed
  const ListFooterComponent = useMemo(() => <HijriDateFooter />, []);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: 0,
      paddingBottom: insets.bottom,
    }),
    [colors, insets.bottom],
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
        contentContainerStyle={contentContainerStyle}
        isRefreshing={isRefreshing}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        progressViewOffset={LAYOUT.SPACING.XLARGE}
        onRefresh={handleRefresh}
      />
    </ThemedView>
  );
}

// Let parent _layout.tsx stack handle header; no local options needed.
export const options: NativeStackNavigationOptions = {
  headerShown: false,
};
