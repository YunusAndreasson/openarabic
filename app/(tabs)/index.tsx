import { StyleSheet, Platform } from 'react-native';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import { ThemedView } from '@/components/ThemedView';
import { LoadingScreen } from '@/components/Loader';
import ArticleList from '@/components/ArticleList';
import PageHeader from '@/components/PageHeader';

// Hooks and Services
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { readingListService } from '@/services/readingList';
import { useLoadingState, useNavigationWithDebounce } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';

// Store
import { fetchInProgressArticles, addToReadingList } from '@/store/readingListSlice';

// Utils and Constants
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { LAYOUT } from '@/constants/layout';
import {
  filterArticles,
  getLatestArticles,
  getFeaturedArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '@/utils/articleUtils';
import { getDayOfYear } from '@/utils/dateUtils';

// Types
import { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';

// Import the extracted components
import ArticleSection from '../../components/ArticleSection';
import FeaturedArticleSection from '../../components/FeaturedArticleSection';
import FilterList from '../../components/FilterList';
import DailyPickSection from '../../components/DailyPickSection';
import ErrorState from '../../components/ErrorState';

// Cache duration constants
const MINUTE_IN_MS = 60000;
const STALE_TIME_SHORT = MINUTE_IN_MS; // 1 minute
const STALE_TIME_MEDIUM = 5 * MINUTE_IN_MS; // 5 minutes

// Create a supabase client for fetching authors directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles before components that use them
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    marginTop: -1, // To hide the header border when content is at the top
  },
});

// Properly wrap useAuth to avoid conditional hook calls
const useSafeAuth = () => {
  // Always call the hook regardless of availability
  let authResult: { session: any } = { session: null };

  // Try to get the session but safely handle errors
  try {
    const authData = useAuth();
    if (authData && authData.session) {
      authResult.session = authData.session;
    }
  } catch (e) {
    // If useAuth is not available, just return null session
    console.warn('useAuth not available or threw an error');
  }

  return authResult;
};

// Memoized article item renderer for better performance

// Helper function to calculate header height
const getHeaderHeight = (insets: { top: number }) => {
  return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.LARGE; // Added LAYOUT.SPACING.LARGE
};

export default function ArticlesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { session } = useSafeAuth();
  const queryClient = useQueryClient();

  // Use the new loading state hook
  const { isLoading: isLoadingState } = useLoadingState();

  // Refs
  const isInitialMount = useRef(true);
  const scrollViewRef = useRef<any>(null);

  // Use React Query instead of local state for articles
  const {
    data: articlesData = [],
    isLoading: isArticlesLoading,
    isFetching: isArticlesFetching,
    error: articlesError,
  } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: STALE_TIME_SHORT,
    placeholderData: () => queryClient.getQueryData(['articles']) || [],
  });

  // Use React Query for categories
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: STALE_TIME_MEDIUM,
    placeholderData: () => queryClient.getQueryData(['categories']) || [],
  });

  // State for authors (keep this as is since it uses Supabase directly)
  const [authors, setAuthors] = useState<Tables<'authors'>[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get inProgressArticles from Redux
  const { inProgressArticles = [], lastOpenedArticles = {} } = useAppSelectorMemo(
    state => state.readingList
  );

  // Define fetchAuthors function
  const fetchAuthors = useCallback(async () => {
    try {
      const { data } = await supabase.from('authors').select('*');
      setAuthors(data ?? []);
    } catch (_err) {
      setAuthors([]);
    }
  }, []);

  // Add an effect to fetch in-progress articles when the component mounts
  useEffect(() => {
    dispatch(fetchInProgressArticles());
  }, [dispatch]);

  // Add effects to fetch authors when the component mounts
  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  // Filter articles by selected author or category
  const filteredArticles = useMemo(() => {
    return filterArticles(articlesData, null, null);
  }, [articlesData]);

  // Organized articles by category
  const beginnerArticles = useMemo(() => getBeginnerArticles(filteredArticles), [filteredArticles]);

  // Refined content container style for consistent spacing
  const contentContainerStyle = useMemo(
    () => ({
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingTop: LAYOUT.SPACING.LARGE,
      paddingBottom:
        LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    }),
    [colors.background]
  );

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

  // Refactored refresh handler using React Query
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);

    // Create an array of refresh promises
    const refreshPromises = [
      queryClient.invalidateQueries({ queryKey: ['articles'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      dispatch(fetchInProgressArticles()),
      fetchAuthors(),
    ];

    // Wait for all refreshes to complete
    Promise.all(refreshPromises)
      .catch(err => {
        console.error('Error during refresh:', err);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [queryClient, dispatch, fetchAuthors]);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Add prefetching for first few articles when data is loaded
  useEffect(() => {
    if (articlesData.length > 0 && !isArticlesLoading) {
      // Prefetch first 10 articles in background
      const articlesToPreload = articlesData.slice(0, 10);
      articlesToPreload.forEach(article => {
        queryClient.prefetchQuery({
          queryKey: ['article', article.id],
          queryFn: () => articlesService.getArticleById(article.id),
          staleTime: 60000, // 1 minute cache
        });
      });

      // If user is authenticated, also prefetch reading list status
      if (session?.user) {
        articlesToPreload.forEach(article => {
          queryClient.prefetchQuery({
            queryKey: ['isInReadingList', session.user.id, article.id],
            queryFn: () => readingListService.isInReadingList(session.user.id, article.id),
            staleTime: 60000,
          });
        });
      }
    }
  }, [articlesData, isArticlesLoading, queryClient, session]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      // Start prefetching article data immediately when press begins
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
      });

      // Navigate to article detail with debounce protection
      navigateTo(`/article/${article.id}`, () => {
        // Add to reading list if authenticated (this runs before navigation)
        if (session?.user) {
          dispatch(addToReadingList(article.id));

          // Also prefetch reading list status
          queryClient.prefetchQuery({
            queryKey: ['isInReadingList', session.user.id, article.id],
            queryFn: () => readingListService.isInReadingList(session.user.id, article.id),
          });
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
    // Only fetch on first mount
    if (isInitialMount.current) {
      handleRefresh();
      isInitialMount.current = false;
    }
  }, [handleRefresh]);

  // Add effect to scroll to top when data is loaded
  useEffect(() => {
    if (articlesData.length > 0 && !isArticlesLoading) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToOffset({ offset: 0, animated: false });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [articlesData.length, isArticlesLoading]);

  // Add effect to prefetch article details for visible articles
  useEffect(() => {
    // Function to prefetch data for all visible articles
    const prefetchVisible = () => {
      if (articlesData.length === 0) return;

      // Get the most important articles to prefetch (first 5)
      const criticalArticles = articlesData.slice(0, 5);

      // Prefetch these immediately with higher priority
      criticalArticles.forEach(article => {
        queryClient.prefetchQuery({
          queryKey: ['article', article.id],
          queryFn: () => articlesService.getArticleById(article.id),
          staleTime: STALE_TIME_SHORT,
        });
      });

      // Prefetch the rest with lower priority after a delay
      if (articlesData.length > 5) {
        setTimeout(() => {
          const remainingArticles = articlesData.slice(5, 15);
          remainingArticles.forEach(article => {
            queryClient.prefetchQuery({
              queryKey: ['article', article.id],
              queryFn: () => articlesService.getArticleById(article.id),
              staleTime: STALE_TIME_SHORT,
            });
          });
        }, 1000); // Delay by 1 second to prioritize rendering
      }
    };

    // Call prefetch when articles data is loaded and not loading
    if (articlesData.length > 0 && !isArticlesLoading) {
      prefetchVisible();
    }
  }, [articlesData, isArticlesLoading, queryClient]);

  // Optimize the data ready check to allow faster rendering
  const isDataReady = useMemo(() => {
    // Consider data ready in any of these conditions:
    // 1. We have articles data
    // 2. We're loading but have cache
    // 3. We're not loading but have an error (show error state)
    return (
      articlesData.length > 0 ||
      (isArticlesLoading && queryClient.getQueryState(['articles'])?.data !== undefined) ||
      (!isArticlesLoading && !!articlesError)
    );
  }, [articlesData.length, isArticlesLoading, articlesError, queryClient]);

  // Use the screen animation hook
  const { fadeInStyle } = useScreenAnimation(isDataReady, isLoadingState);

  // Memoized child components to prevent re-renders
  const DailyPick = useMemo(() => {
    const dailyPickArticle = getDailyPickArticle(articlesData, getDayOfYear());
    return (
      <DailyPickSection article={dailyPickArticle} onPress={handleArticlePress} showTitle={true} />
    );
  }, [articlesData, handleArticlePress]);

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
        // Show loading state if articles are fetching and we don't have data yet
        isLoading={isArticlesFetching && latestArticles.length === 0}
      />
    );
  }, [articlesData, handleArticlePress, isArticlesFetching]);

  const FeaturedTextsSection = useMemo(() => {
    const featuredArticles = getFeaturedArticles(articlesData);

    return (
      <FeaturedArticleSection
        title="Featured Texts"
        articles={featuredArticles}
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
        title="Browse by Author"
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
        title="Browse by Category"
        items={categoriesData}
        selectedId={null}
        onSelect={handleSelectCategory}
      />
    );
  }, [categoriesData, handleSelectCategory]);

  // Create a pre-rendered header component for the FlatList to avoid re-rendering the entire list
  const ListHeaderComponent = useMemo(() => {
    return (
      <>
        {DailyPick}
        {ContinueReadingSection}
        {LatestTextsSection}
        {FeaturedTextsSection}
        {BeginnerFriendlySection}
        {AuthorFilterSection}
        {CategoryFilterSection}
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

  // If no cached data and still loading, show a minimal loading screen
  if (isArticlesLoading && articlesData.length === 0 && !isDataCached) {
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
          articles={[]}
          isLoading={isArticlesLoading}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onArticlePress={handleArticlePress}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={EmptyStateComponent}
          contentContainerStyle={{
            ...contentContainerStyle,
            paddingTop: getHeaderHeight(insets),
          }}
          initialNumToRender={1}
          windowSize={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
        />
        <PageHeader title="Texts" />
      </ThemedView>
    </Animated.View>
  );
}
