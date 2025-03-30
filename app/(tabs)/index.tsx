import { StyleSheet } from 'react-native';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { LoadingScreen } from '@/components/Loader';
import ArticleList from '@/components/index/ArticleList';
import PageHeader from '@/components/PageHeader';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../../hooks/useAuth';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { readingListService } from '@/services/readingList';
import { useLoadingState, useNavigationWithDebounce, useScreenFocusRefresh } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import { fetchInProgressArticles, addToReadingList } from '@/store/readingListSlice';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import {
  filterArticles,
  getLatestArticles,
  getFeaturedArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '@/utils/articleUtils';
import { getDayOfYear } from '@/utils/dateUtils';
import { ArticleSection } from '../../components/article';
import FeaturedArticleSection from '../../components/index/FeaturedArticleSection';
import { mediumFeedback } from '@/utils/haptics';

// Types
import { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';

// Import the extracted components
import FilterList from '../../components/index/FilterList';
import DailyPickSection from '../../components/index/DailyPickSection';
import ErrorState from '../../components/ErrorState';

// Cache duration constants

// Create a supabase client for fetching authors directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles before components that use them
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    flexGrow: 1,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
  },
});

export default function ArticlesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Use the new loading state hook
  const { isLoading: isLoadingState } = useLoadingState();

  // Refs
  const isInitialMount = useRef(true);

  // Use React Query instead of local state for articles
  const {
    data: articlesData = [],
    isLoading: isArticlesLoading,
    isFetching: isArticlesFetching,
    error: articlesError,
  } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  // Use React Query for categories with longer cache times
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: 1800000,
    gcTime: 3600000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Use React Query for authors with proper caching
  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const { data } = await supabase.from('authors').select('*').order('name');
      return data || [];
    },
    staleTime: 1800000,
    gcTime: 3600000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get inProgressArticles from Redux
  const { inProgressArticles = [], lastOpenedArticles = {} } = useAppSelectorMemo(
    state => state.readingList
  );

  // Filter articles by selected author or category
  const filteredArticles = useMemo(() => {
    return filterArticles(articlesData, null, null);
  }, [articlesData]);

  // Organized articles by category
  const beginnerArticles = useMemo(() => getBeginnerArticles(filteredArticles), [filteredArticles]);

  // Sort in-progress articles by last opened time
  const sortedInProgressArticles = useMemo(() => {
    if (!inProgressArticles?.length) return [];

    return [...inProgressArticles].sort((a, b) => {
      const aTime = lastOpenedArticles?.[a.id] ? new Date(lastOpenedArticles[a.id]).getTime() : 0;
      const bTime = lastOpenedArticles?.[b.id] ? new Date(lastOpenedArticles[b.id]).getTime() : 0;

      // Sort by last opened time (most recent first)
      return bTime - aTime;
    });
  }, [inProgressArticles, lastOpenedArticles]);

  // Combined loading and fetching states for better UX
  const isFetching = isArticlesFetching;

  // Handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (isFetching) return;

    mediumFeedback();
    setIsRefreshing(true);

    try {
      // Invalidate all related queries at once
      await queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return key === 'articles' || key === 'categories' || key === 'authors';
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, isFetching]);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  const handleArticlePress = useCallback(
    (article: Article) => {
      // Only prefetch if not already in cache
      const articleQuery = queryClient.getQueryData(['article', article.id]);
      if (!articleQuery) {
        queryClient.prefetchQuery({
          queryKey: ['article', article.id],
          queryFn: () => articlesService.getArticleById(article.id),
          staleTime: 300000, // Cache for 5 minutes
          gcTime: 600000, // Keep in garbage collection for 10 minutes
        });
      }

      // Only prefetch reading list status if user is logged in and not in cache
      if (session?.user) {
        const readingListQuery = queryClient.getQueryData([
          'isInReadingList',
          session.user.id,
          article.id,
        ]);
        if (!readingListQuery) {
          queryClient.prefetchQuery({
            queryKey: ['isInReadingList', session.user.id, article.id],
            queryFn: () => readingListService.isInReadingList(session.user.id, article.id),
            staleTime: 300000,
            gcTime: 600000,
          });
        }
      }

      navigateTo(`/article/${article.id}`, () => {
        if (session?.user) {
          dispatch(addToReadingList(article.id));
        }
      });
    },
    [dispatch, session?.user, navigateTo, queryClient]
  );

  const handleSelectAuthor = useCallback((authorId: number) => {
    // Use simple direct URL string for consistent behavior across platforms
    router.push(`/filter?type=author&id=${authorId}`);
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    // Use simple direct URL string for consistent behavior across platforms
    router.push(`/filter?type=category&id=${categoryId}`);
  }, []);

  const handleClearFilters = useCallback(() => {
    // No-op since we removed scroll functionality
  }, []);

  // Add effect to handle first load
  useEffect(() => {
    if (isInitialMount.current) {
      handleRefresh();
      isInitialMount.current = false;
    }
  }, [handleRefresh]);

  // Update the loading check to consider preloader state
  const isDataReady = useMemo(() => {
    // Consider data ready in any of these conditions:
    // 1. We have articles data
    // 2. We have an error to display
    return articlesData.length > 0 || (!isArticlesLoading && !!articlesError);
  }, [articlesData.length, isArticlesLoading, articlesError]);

  // Use the screen animation hook
  const { fadeInStyle } = useScreenAnimation(isDataReady, isLoadingState);

  // Memoized child components to prevent re-renders
  const DailyPick = useMemo(() => {
    // Don't show daily pick if there's an error or no articles
    if (articlesError || articlesData.length === 0) return null;

    const dailyPickArticle = getDailyPickArticle(articlesData, getDayOfYear());
    return (
      <DailyPickSection article={dailyPickArticle} onPress={handleArticlePress} showTitle={true} />
    );
  }, [articlesData, articlesError, handleArticlePress]);

  const ContinueReadingSection = useMemo(() => {
    return (
      <ArticleSection
        title="Continue Reading"
        articles={sortedInProgressArticles}
        onArticlePress={article => router.push(`/article/${article.id}`)}
        showTimeAgo={true}
        getLastOpenedAt={articleId => lastOpenedArticles && lastOpenedArticles[articleId]}
        emptyStateMessage="Start reading to save your progress here"
      />
    );
  }, [sortedInProgressArticles, lastOpenedArticles]);

  const LatestTextsSection = useMemo(() => {
    const latestArticles = getLatestArticles(articlesData, 10);

    return (
      <ArticleSection
        title="Latest Texts"
        articles={latestArticles}
        onArticlePress={handleArticlePress}
        showTimeAgo
        hideDifficultyLabel
      />
    );
  }, [articlesData, handleArticlePress]);

  const FeaturedTextsSection = useMemo(() => {
    const featuredArticles = getFeaturedArticles(articlesData);

    return (
      <FeaturedArticleSection
        title="Featured Texts"
        articles={featuredArticles || []}
        onArticlePress={handleArticlePress}
      />
    );
  }, [articlesData, handleArticlePress]);

  const BeginnerFriendlySection = useMemo(() => {
    if (beginnerArticles.length === 0) return null;
    return (
      <ArticleSection
        title="Beginner Friendly"
        articles={beginnerArticles}
        onArticlePress={handleArticlePress}
        hideDifficulty={true}
      />
    );
  }, [beginnerArticles, handleArticlePress]);

  const AuthorFilterSection = useMemo(() => {
    return (
      <FilterList
        title="Authors"
        items={authors}
        selectedId={null}
        onSelect={handleSelectAuthor}
        onClearFilter={handleClearFilters}
      />
    );
  }, [authors, handleSelectAuthor, handleClearFilters]);

  const CategoryFilterSection = useMemo(() => {
    return (
      <FilterList
        title="Categories"
        items={categoriesData}
        selectedId={null}
        onSelect={handleSelectCategory}
      />
    );
  }, [categoriesData, handleSelectCategory]);

  // Create a pre-rendered header component for the Flash to avoid re-rendering the entire list
  const ListHeaderComponent = useMemo(() => {
    // Create an array of sections in the exact order we want them to appear
    const orderedSections = [
      DailyPick,
      ContinueReadingSection,
      LatestTextsSection,
      FeaturedTextsSection, // This MUST appear here, before filters
      BeginnerFriendlySection,
      AuthorFilterSection,
      CategoryFilterSection,
    ];

    // Filter out any null sections and render them in order
    return (
      <>
        {orderedSections
          .filter(section => section !== null)
          .map((section, index) => (
            <React.Fragment key={index}>{section}</React.Fragment>
          ))}
      </>
    );
  }, [
    DailyPick,
    ContinueReadingSection,
    LatestTextsSection,
    FeaturedTextsSection,
    BeginnerFriendlySection,
    AuthorFilterSection,
    CategoryFilterSection,
  ]);

  // Create an empty state component
  const EmptyStateComponent = useMemo(() => {
    // Return an empty fragment as a React element
    return <></>;
  }, []);

  // Check if data is already in cache to optimize loading behavior
  const articlesQuery = queryClient.getQueryState(['articles']);
  const isDataCached = articlesQuery?.data !== undefined;

  // Use the screen focus refresh hook with debounce - with proper caching
  useScreenFocusRefresh(
    queryClient,
    'articles',
    undefined,
    300000, // Cache for 5 minutes (same as query)
    true, // Skip initial focus
    false // Only refresh if stale
  );

  useScreenFocusRefresh(
    queryClient,
    'categories',
    undefined,
    600000, // Cache for 10 minutes (same as query)
    true, // Skip initial focus
    false // Only refresh if stale
  );

  // Compute dynamic styles based on insets with all necessary styles
  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: getHeaderHeight(insets),
    }),
    [insets, colors.background]
  );

  // If no data and still loading, show loading screen
  if ((isArticlesLoading && articlesData.length === 0) || isRefreshing) {
    return <LoadingScreen />;
  }

  // Show error state only if there's no cached data
  if (articlesError && !isRefreshing && !isDataCached) {
    return (
      <ErrorState
        message={articlesError.message}
        onRetry={() => {
          handleRefresh();
        }}
      />
    );
  }

  // Main content view
  return (
    <Animated.View
      style={[styles.container, fadeInStyle]}
      entering={FadeIn.duration(300).springify().damping(14).stiffness(100)}
    >
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        accessibilityLabel="Articles browse screen"
        accessibilityRole="scrollbar"
      >
        <ArticleList
          articles={articlesData}
          isLoading={isArticlesLoading}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onArticlePress={handleArticlePress}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={EmptyStateComponent}
          contentContainerStyle={contentContainerStyle}
          hideMainList={true}
        />
        <PageHeader title="Texts" />
      </ThemedView>
    </Animated.View>
  );
}
