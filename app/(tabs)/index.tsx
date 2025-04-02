import { StyleSheet, View, FlatList, ScrollView } from 'react-native';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { Loader } from '@/components/Loader';
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
import { addToReadingList } from '@/store/readingListSlice';
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
import { mediumFeedback } from '@/utils/haptics';
import { setDailyPick, setFeaturedArticles } from '@/store/featuredContentSlice';
import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import SectionTitle from '@/components/SectionTitle';
import { formatTimeAgo } from '@/utils/dateUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import ThemedCard from '@/components/ThemedCard';
import Pill from '@/components/Pill';

// Types
import { Article } from '@/types/articles.types';

// Import the extracted components
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
  sectionContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articlesListContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.TINY,
  },
  arrowText: {
    opacity: LAYOUT.OPACITY.DISABLED / 1.5,
  },
  horizontalList: {
    paddingLeft: LAYOUT.SPACING.MEDIUM,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  horizontalArticleContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});

// Add ArticleItem component outside of the main component
const ArticleItem = React.memo(
  ({ article, onPress }: { article: Article; onPress: (article: Article) => void }) => {
    const categoryName = article.category?.name
      ? capitalizeFirstLetter(article.category.name)
      : 'Uncategorized';

    // Format time directly without TimeAgo component
    const timeAgoText = formatTimeAgo(article.created_at);

    return (
      <View style={styles.articleContainer}>
        <BaseCard onPress={() => onPress(article)} style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText
                type="bodyBold"
                numberOfLines={2}
                colorName="text"
                style={styles.titleText}
              >
                {article.title}
              </ThemedText>
              <ThemedText type="caption" colorName="textSecondary" numberOfLines={1}>
                {categoryName} · {timeAgoText} · by {article.author?.name || 'Anonymous'}
              </ThemedText>
            </View>
            <View style={styles.iconContainer}>
              <ThemedText type="label" variant="secondary" style={styles.arrowText}>
                →
              </ThemedText>
            </View>
          </View>
        </BaseCard>
      </View>
    );
  }
);

ArticleItem.displayName = 'ArticleItem';

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

  // Get the featured content state from Redux
  const { dailyPick, featuredArticles: featuredArticlesState } = useAppSelectorMemo(
    state => state.featuredContent
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

    return [...inProgressArticles]
      .sort((a, b) => {
        const aTime = lastOpenedArticles?.[a.id] ? new Date(lastOpenedArticles[a.id]).getTime() : 0;
        const bTime = lastOpenedArticles?.[b.id] ? new Date(lastOpenedArticles[b.id]).getTime() : 0;

        // Sort by last opened time (most recent first)
        return bTime - aTime;
      })
      .slice(0, 20); // Limit to 20 articles
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

  // Effect to handle daily pick updates
  useEffect(() => {
    if (articlesError || articlesData.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    if (dailyPick.date !== today) {
      const dailyPickArticle = getDailyPickArticle(articlesData, getDayOfYear());
      if (dailyPickArticle) {
        dispatch(setDailyPick({ articleId: dailyPickArticle.id, date: today }));
      }
    }
  }, [articlesData, articlesError, dailyPick.date, dispatch]);

  // Effect to handle featured articles updates
  useEffect(() => {
    if (articlesError || articlesData.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    if (featuredArticlesState.lastUpdated !== today) {
      const featuredArticlesList = getFeaturedArticles(articlesData, 3);
      if (featuredArticlesList.length > 0) {
        dispatch(
          setFeaturedArticles({
            ids: featuredArticlesList.map(article => article.id),
            lastUpdated: today,
          })
        );
      }
    }
  }, [articlesData, articlesError, featuredArticlesState.lastUpdated, dispatch]);

  // Memoized child components to prevent re-renders
  const DailyPick = useMemo(() => {
    // Don't show daily pick if there's an error or no articles
    if (articlesError || articlesData.length === 0) return null;

    let dailyPickArticle: Article | null = null;
    if (dailyPick.articleId !== null) {
      dailyPickArticle = articlesData.find(article => article.id === dailyPick.articleId) || null;
    }

    return dailyPickArticle ? (
      <View style={styles.sectionContainer}>
        <DailyPickSection
          article={dailyPickArticle}
          onPress={handleArticlePress}
          showTitle={false}
        />
      </View>
    ) : null;
  }, [articlesData, articlesError, handleArticlePress, dailyPick.articleId]);

  const ContinueReadingSection = useMemo(() => {
    if (sortedInProgressArticles.length === 0) return null;

    return (
      <ArticleSection
        title="Continue Reading"
        articles={sortedInProgressArticles}
        onArticlePress={article => router.push(`/article/${article.id}`)}
        showTimeAgo={true}
        getLastOpenedAt={articleId => lastOpenedArticles && lastOpenedArticles[articleId]}
      />
    );
  }, [sortedInProgressArticles, lastOpenedArticles]);

  const LatestTextsSection = useMemo(() => {
    const latestArticles = getLatestArticles(articlesData, 20);

    return (
      <View style={styles.sectionContainer}>
        <SectionTitle title="Latest Texts" />
        <View style={styles.articlesListContainer}>
          {latestArticles.map(article => (
            <ArticleItem key={article.id} article={article} onPress={handleArticlePress} />
          ))}
        </View>
      </View>
    );
  }, [articlesData, handleArticlePress]);

  const BeginnerFriendlySection = useMemo(() => {
    if (beginnerArticles.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <SectionTitle title="Beginner Friendly" />
        <FlatList
          data={beginnerArticles.slice(0, 20)}
          renderItem={({ item }) => (
            <View style={styles.horizontalArticleContainer}>
              <ThemedCard
                variant="compact"
                article={item}
                onPress={() => handleArticlePress(item)}
                hideDifficulty={true}
              />
            </View>
          )}
          keyExtractor={item => `beginner-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  }, [beginnerArticles, handleArticlePress]);

  const AuthorFilterSection = useMemo(() => {
    return (
      <View style={styles.sectionContainer}>
        <SectionTitle title="Authors" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {authors.map(author => (
            <Pill
              key={`author-${author.id}`}
              id={author.id}
              label={capitalizeFirstLetter(author.name)}
              isSelected={false}
              onSelect={id => handleSelectAuthor(Number(id))}
              variant="filter"
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [authors, handleSelectAuthor]);

  const CategoryFilterSection = useMemo(() => {
    return (
      <View style={styles.sectionContainer}>
        <SectionTitle title="Categories" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {categoriesData.map(category => (
            <Pill
              key={`category-${category.id}`}
              id={category.id}
              label={capitalizeFirstLetter(category.name)}
              isSelected={false}
              onSelect={id => handleSelectCategory(Number(id))}
              variant="filter"
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [categoriesData, handleSelectCategory]);

  // Create a pre-rendered header component for the Flash to avoid re-rendering the entire list
  const ListHeaderComponent = useMemo(() => {
    const orderedSections = [
      DailyPick,
      ContinueReadingSection,
      LatestTextsSection,
      BeginnerFriendlySection,
      AuthorFilterSection,
      CategoryFilterSection,
    ];

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
      paddingTop: getHeaderHeight(insets) + LAYOUT.SPACING.LARGE * 3, // Triple the top padding
    }),
    [insets, colors.background]
  );

  // Use state to control loading overlay visibility
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(
    (isArticlesLoading && articlesData.length === 0) || isRefreshing
  );

  // Update loading overlay visibility when loading state changes
  useEffect(() => {
    setShowLoadingOverlay((isArticlesLoading && articlesData.length === 0) || isRefreshing);
  }, [isArticlesLoading, articlesData.length, isRefreshing]);

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

  // Main content view with loading overlay when needed
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

        {/* Loading overlay that fades out rather than jumps */}
        {showLoadingOverlay && (
          <Animated.View
            style={[styles.loadingOverlay, { backgroundColor: colors.background }]}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(300)}
          >
            <Loader size="large" color={colors.tint} />
          </Animated.View>
        )}
      </ThemedView>
    </Animated.View>
  );
}
