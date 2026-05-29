import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/common';
import {
  ArticleList,
  BrandFooter,
  ContinueReadingSection,
  DiscoverySections,
  FilterSection,
  HorizontalFeaturedSection,
} from '@/components/explore';
import { LAYOUT } from '@/constants/layout';
import { articleQueries, readingProgressQueries } from '@/constants/queries';
import { getCategoryFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useToast } from '@/components/providers/ToastProvider';
import type { CategoryId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

const FOOTER_COMPONENT = <BrandFooter />;

const styles = StyleSheet.create({
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
        showToast(STRINGS.STUDY_LIST_EMPTY_HINT, 4000);
      }
    }
  }, [from, showToast]);

  const { data: categoriesData = [] } = useQuery(articleQueries.categories());
  // Ref for stable callback access to latest categoriesData
  const categoriesDataRef = useRef(categoriesData);
  useEffect(() => {
    categoriesDataRef.current = categoriesData;
  });

  const { data: articlesData = [] } = useQuery({
    ...articleQueries.all(),
    refetchOnMount: false, // Don't refetch on mount if we have data
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Build category counts from articles
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const article of articlesData) {
      counts[article.category.id] = (counts[article.category.id] || 0) + 1;
    }
    return counts;
  }, [articlesData]);

  // Build categories list with counts (only show categories with articles, sorted alphabetically)
  const categoriesWithArticles = useMemo(
    () =>
      buildEntitiesWithCounts(categoriesData, categoryCounts)
        .filter(c => c.count > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categoriesData, categoryCounts],
  );

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback(); // Confirm the committed pull-to-refresh gesture (RN RefreshControl doesn't fire one).
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
  };

  const handleSelectFilter = useCallback((id: number, _name?: string, filterType?: string) => {
    if (filterType === 'category') {
      const category = categoriesDataRef.current.find(c => c.id === id);
      if (category) {
        router.push(getCategoryFilterRoute(id as CategoryId, category.name));
      }
    }
  }, []);

  // Optimized header component - memoize individual sections
  const headerSections = useMemo(() => {
    const sections = [];

    // Continue Reading / Getting Started section (adaptive based on user progress)
    sections.push(<ContinueReadingSection key="continue-reading" articlesData={articlesData} />);

    // Featured articles (intelligent selection of unread articles)
    sections.push(
      <HorizontalFeaturedSection
        key="featured"
        articlesData={articlesData}
        refreshKey={refreshKey}
        scope="global"
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

    // Discovery sections (compact horizontal cards: beginner, short reads, long reads, advanced)
    sections.push(<DiscoverySections key="discovery" articlesData={articlesData} />);

    return sections;
  }, [articlesData, refreshKey, categoriesWithArticles, handleSelectFilter]);

  return (
    <ArticleList
      contentContainerStyle={styles.listContentContainer}
      isRefreshing={isRefreshing}
      ListHeaderComponent={<>{headerSections}</>}
      ListFooterComponent={FOOTER_COMPONENT}
      progressViewOffset={LAYOUT.SPACING.XLARGE}
      onRefresh={handleRefresh}
    />
  );
}

// Let parent _layout.tsx stack handle header; no local options needed.
export const options = {
  headerShown: false,
} as const;
