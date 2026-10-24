import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { SectionLabel } from '@/components/common';
import {
  ArticleList,
  ContinueReadingSection,
  DiscoverySections,
  FilterSection,
  GetStartedChecklist,
  HardestWordsSection,
  HorizontalFeaturedSection,
} from '@/components/explore';
import { WelcomeIntro } from '@/components/tutorials/WelcomeIntro';
import { LAYOUT } from '@/constants/layout';
import { articleQueries, readingProgressQueries } from '@/constants/queries';
import { getCategoryFilterRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { TutorialId } from '@/constants/tutorials';
import { useAuth } from '@/hooks/auth/useAuth';
import { useExploreRails } from '@/hooks/explore/useExploreRails';
import { useOnboardingChecklist } from '@/hooks/onboarding/useOnboardingChecklist';
import { useOpenStarterArticle } from '@/hooks/onboarding/useOpenStarterArticle';
import { useTutorial } from '@/hooks/tutorials/useTutorial';
import { useMiniPlayerClearance } from '@/hooks/audio/useMiniPlayerClearance';
import { useTabBarAutoHide } from '@/hooks/ui/useTabBarAutoHide';
import type { CategoryId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

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
  const tabBarAutoHide = useTabBarAutoHide();
  // The feed used to end on a brand footer whose dimmed ring logo read as a
  // stalled loading spinner under the last rail. It now ends on the same
  // clearance the other three tabs use, which also keeps the last rail out from
  // under the mini player — Explore was the one tab that let it cover content.
  const miniPlayerClearance = useMiniPlayerClearance();

  // No welcome toast on arrival from an empty state. The Playlist and Practice
  // empty states each send the learner here with their hint already read, and
  // the toast repeated that hint word for word four seconds later.

  const { data: categoriesData = [] } = useQuery(articleQueries.categories());
  // Ref for stable callback access to latest categoriesData
  const categoriesDataRef = useRef(categoriesData);
  useEffect(() => {
    categoriesDataRef.current = categoriesData;
  });

  const {
    data: articlesData = [],
    isPending: isCatalogPending,
    isError: isCatalogError,
    isFetching: isCatalogFetching,
    refetch: refetchCatalog,
  } = useQuery({
    ...articleQueries.all(),
    refetchOnMount: false, // Don't refetch on mount if we have data
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // The feed is built from the catalogue, so with no catalogue there is no feed —
  // and every section used to return null, which left a blank tab under the
  // title with nothing to say why. A retry after a failure counts as loading
  // again; a pull-to-refresh already has its own spinner, so it doesn't.
  const hasCatalog = articlesData.length > 0;
  const isCatalogLoading =
    !hasCatalog && !isRefreshing && (isCatalogPending || (isCatalogError && isCatalogFetching));
  const hasCatalogFailed = !hasCatalog && isCatalogError && !isCatalogLoading;

  // First-run onboarding: "Get started" checklist + one-shot welcome intro
  const checklist = useOnboardingChecklist(articlesData);
  const intro = useTutorial(TutorialId.WELCOME_INTRO);
  const { trigger: triggerIntro } = intro;
  useEffect(() => {
    if (checklist.isEligible) {
      triggerIntro();
    }
  }, [checklist.isEligible, triggerIntro]);

  // Every article rail on the tab, chosen together so no text appears twice
  const rails = useExploreRails(articlesData, refreshKey, checklist.isChecklistVisible);

  const handleOpenFirstText = useOpenStarterArticle(articlesData);

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

  const handleRefresh = useCallback(async () => {
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
      void handleError(error instanceof Error ? error : new Error(STRINGS.REFRESH_FAILED));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user]);

  const handleRefreshRequest = useCallback(() => {
    void handleRefresh();
  }, [handleRefresh]);

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

    // First-run "Get started" checklist (renders null once completed/suppressed).
    // Held back while the welcome intro is up: both resolve from the same
    // eligibility decision, so without this the user watches the card appear and
    // then get covered by the modal 600ms later.
    sections.push(
      <GetStartedChecklist
        key="get-started"
        articlesData={articlesData}
        checklist={checklist}
        isSuppressedByIntro={intro.isVisible}
      />,
    );

    // Continue reading, or Getting started — absent while the checklist is up
    if (rails.lead) {
      sections.push(<ContinueReadingSection key="continue-reading" rail={rails.lead} />);
    }

    // Featured articles (intelligent selection of unread articles)
    sections.push(
      <HorizontalFeaturedSection key="featured" articles={rails.featured} isFirst={!rails.lead} />,
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

    // The words the learner keeps forgetting. Between the topic grid and the
    // discovery rails deliberately: the three article rails above stay
    // contiguous, and this is the change of pace before the browse block
    // resumes. Self-contained — it owns its own query, so it is not in the
    // dependency list below and does not need to be.
    sections.push(<HardestWordsSection key="hardest-words" />);

    // Discovery sections (compact horizontal cards: beginner, short reads, long reads, advanced)
    sections.push(<DiscoverySections key="discovery" rails={rails.discovery} />);

    return sections;
  }, [articlesData, rails, categoriesWithArticles, handleSelectFilter, checklist, intro.isVisible]);

  return (
    <>
      {/* No horizontal padding on the scroll container — each section owns the
          standard screen inset so horizontal rails can bleed edge-to-edge */}
      <ArticleList
        // Scroll direction drives the tab bar out of the way on Android; on iOS
        // UIKit reads this same scroll view itself. See `useTabBarAutoHide`.
        {...tabBarAutoHide}
        isRefreshing={isRefreshing}
        isLoading={isCatalogLoading}
        isError={hasCatalogFailed}
        onRetry={() => void refetchCatalog()}
        ListHeaderComponent={<>{headerSections}</>}
        contentContainerStyle={{ paddingBottom: miniPlayerClearance }}
        progressViewOffset={LAYOUT.SPACING.XLARGE}
        onRefresh={handleRefreshRequest}
      />
      <WelcomeIntro
        visible={intro.isVisible}
        onDismiss={intro.dismiss}
        onOpenFirstText={handleOpenFirstText}
      />
    </>
  );
}

// Let parent _layout.tsx stack handle header; no local options needed.
