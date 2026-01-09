import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ScrollView } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { SectionLabel } from '@/components/common';
import { ArticleList , AuthorInFocusSection , BrandFooter , ContinueReadingSection , DiscoverWordsSection , FilterSection , IntelligentArticleSection , MoreFiltersSection } from '@/components/explore';
import { LAYOUT } from '@/constants/layout';
import { articleQueries, readingProgressQueries } from '@/constants/queries';
import {
  getAuthorFilterRoute,
  getCategoryFilterRoute,
  getDifficultyFilterRoute,
  getLengthFilterRoute,
} from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useToast } from '@/components/providers/ToastProvider';
import type { AuthorId, CategoryId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  listContentContainer: LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
});

/**
 * Generic helper to build entities (categories/authors) with article counts
 * All categories/authors are guaranteed to have articles
 */
function buildEntitiesWithCounts<T extends { id: number; name: string }>(
  entities: T[],
  counts: Record<number, number>,
): (T & { count: number })[] {
  return entities.map(entity => ({
    ...entity,
    count: counts[entity.id] || 0,
  }));
}

export default function ExploreScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { from } = useLocalSearchParams<{ from?: string }>();

  // Show welcome toast when navigating from empty states
  const hasShownWelcomeRef = useRef<string | null>(null);
  useEffect(() => {
    if (from && from !== hasShownWelcomeRef.current) {
      hasShownWelcomeRef.current = from;
      if (from === 'playlist') {
        showToast(STRINGS.EXPLORE_WELCOME_FROM_PLAYLIST, 4000);
      } else if (from === 'practice') {
        showToast(STRINGS.EXPLORE_WELCOME_FROM_PRACTICE, 4000);
      }
    }
  }, [from, showToast]);

  // Scroll position preservation refs
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef<number>(0);
  const isRestoringScrollRef = useRef<boolean>(false);

  const { data: categoriesData = [] } = useQuery(articleQueries.categories());

  const { data: authorsData = [] } = useQuery(articleQueries.authors());

  const { data: articlesData = [] } = useQuery({
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

  // OPTIMIZED: Single-pass count calculation for categories, authors, difficulty, and length
  const { categoryCounts, authorCounts, difficultyCounts, lengthCounts } = useMemo(() => {
    return articlesData.reduce<{
      categoryCounts: Record<number, number>;
      authorCounts: Record<number, number>;
      difficultyCounts: Record<number, number>;
      lengthCounts: Record<number, number>;
    }>(
      (acc, article) => {
        // Every article has a category and author (guaranteed)
        acc.categoryCounts[article.category.id] =
          (acc.categoryCounts[article.category.id] || 0) + 1;
        acc.authorCounts[article.author.id] = (acc.authorCounts[article.author.id] || 0) + 1;

        // Difficulty counts (map 1-5 to 3 buckets)
        const diffLevel = article.difficulty_level ?? 3;
        const diffBucket = diffLevel <= 2 ? 1 : diffLevel <= 4 ? 2 : 3;
        acc.difficultyCounts[diffBucket] = (acc.difficultyCounts[diffBucket] || 0) + 1;

        // Length counts based on reading time (sentences / 4 = minutes)
        const minutes = Math.ceil((article.article_sentences?.length ?? 0) / 4);
        const lengthBucket = minutes <= 2 ? 1 : minutes <= 5 ? 2 : 3;
        acc.lengthCounts[lengthBucket] = (acc.lengthCounts[lengthBucket] || 0) + 1;

        return acc;
      },
      { categoryCounts: {}, authorCounts: {}, difficultyCounts: {}, lengthCounts: {} },
    );
  }, [articlesData]);

  // Build categories list with counts (only show categories with articles)
  const categoriesWithArticles = useMemo(
    () => buildEntitiesWithCounts(categoriesData, categoryCounts).filter(c => c.count > 0),
    [categoriesData, categoryCounts],
  );

  // Build authors list with counts (only show authors with articles)
  const authorsWithArticles = useMemo(
    () => buildEntitiesWithCounts(authorsData, authorCounts).filter(a => a.count > 0),
    [authorsData, authorCounts],
  );

  // Build difficulty items with counts (only show items with articles)
  const difficultyItems = useMemo(
    () =>
      [
        { id: 1, name: STRINGS.DIFFICULTY_BEGINNER, count: difficultyCounts[1] || 0 },
        { id: 2, name: STRINGS.DIFFICULTY_INTERMEDIATE, count: difficultyCounts[2] || 0 },
        { id: 3, name: STRINGS.DIFFICULTY_ADVANCED, count: difficultyCounts[3] || 0 },
      ].filter(item => item.count > 0),
    [difficultyCounts],
  );

  // Build length items with counts (only show items with articles)
  const lengthItems = useMemo(
    () =>
      [
        { id: 1, name: STRINGS.LENGTH_SHORT, count: lengthCounts[1] || 0 },
        { id: 2, name: STRINGS.LENGTH_MEDIUM, count: lengthCounts[2] || 0 },
        { id: 3, name: STRINGS.LENGTH_LONG, count: lengthCounts[3] || 0 },
      ].filter(item => item.count > 0),
    [lengthCounts],
  );

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

  const handleSelectFilter = useCallback(
    (id: number, name?: string, filterType?: string) => {
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
      } else if (filterType === 'difficulty') {
        router.push(getDifficultyFilterRoute(id, name));
      } else if (filterType === 'length') {
        router.push(getLengthFilterRoute(id, name));
      }
    },
    [categoriesData, authorsData],
  );

  // Optimized header component - memoize individual sections
  const headerSections = useMemo(() => {
    const sections = [];

    // Continue Reading / Getting Started section (adaptive based on user progress)
    sections.push(
      <ContinueReadingSection key="continue-reading" articlesData={articlesData} />,
    );

    // Featured articles (intelligent selection of unread articles)
    sections.push(
      <IntelligentArticleSection
        key="featured"
        articlesData={articlesData}
        refreshKey={refreshKey}
      />,
    );

    // Categories section
    sections.push(
      <View key="categories-wrapper">
        <SectionLabel title={STRINGS.SECTION_CATEGORIES} />
        <FilterSection
          items={categoriesWithArticles}
          onSelect={handleSelectFilter}
          filterType="category"
        />
      </View>,
    );

    // Author in Focus section (highlights one author with most unread content)
    // Placed before Authors list to create "try this one → browse all" flow
    sections.push(
      <AuthorInFocusSection key="author-in-focus" articlesData={articlesData} />,
    );

    // Authors section
    sections.push(
      <View key="authors-wrapper">
        <SectionLabel title={STRINGS.SECTION_AUTHORS} />
        <FilterSection
          items={authorsWithArticles}
          onSelect={handleSelectFilter}
          filterType="author"
        />
      </View>,
    );

    // Collapsible More Filters section (Difficulty + Length)
    sections.push(
      <MoreFiltersSection
        key="more-filters"
        difficultyItems={difficultyItems}
        lengthItems={lengthItems}
        onSelect={handleSelectFilter}
      />,
    );

    // Discover Words section (tap words to add to Practice)
    sections.push(<DiscoverWordsSection key="discover-words" />);

    return sections;
  }, [
    articlesData,
    refreshKey,
    categoriesWithArticles,
    authorsWithArticles,
    difficultyItems,
    lengthItems,
    handleSelectFilter,
  ]);

  const ListHeaderComponent = useMemo(() => <>{headerSections}</>, [headerSections]);

  const ListFooterComponent = useMemo(() => <BrandFooter />, []);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
    }),
    [],
  );

  return (
    <ThemedView useSafeArea={false} style={styles.container}>
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
