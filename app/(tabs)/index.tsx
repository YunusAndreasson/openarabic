import { FlashList } from '@shopify/flash-list';
import { createClient } from '@supabase/supabase-js';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { LoadingScreen } from '@/components/Loader';
import PageHeader from '@/components/PageHeader';
import Pill from '@/components/Pill';
import SectionTitle from '@/components/SectionTitle';
import ThemedCard from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ArticleList from '@/components/index/ArticleList';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { setDailyPick } from '@/store/featuredContentSlice';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { fetchInProgressArticles } from '@/store/readingListSlice';
import type { Article } from '@/types/articles.types';
import {
  filterArticles,
  getLatestArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '@/utils/articleUtils';
import { getDayOfYear, formatTimeAgo } from '@/utils/dateUtils';
import { mediumFeedback } from '@/utils/haptics';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import ErrorState from '../../components/ErrorState';
import { ArticleSection } from '../../components/article';
import DailyPickSection from '../../components/index/DailyPickSection';

// Cache duration constants

// Create a supabase client for fetching authors directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles before components that use them
const styles = StyleSheet.create({
  arrowText: {
    opacity: LAYOUT.OPACITY.DISABLED / 1.5,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleItemPadding: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  beginnerContainer: {
    marginTop: LAYOUT.SPACING.TINY,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    flex: 1,
  },
  filterSectionContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  horizontalArticleContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  horizontalList: {
    paddingLeft: LAYOUT.SPACING.MEDIUM,
    paddingRight: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.SPACING.TINY,
  },
  listContentContainer: {
    flexGrow: 1,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.SPACING.MEDIUM,
  },
  metadataText: {
    marginTop: LAYOUT.SPACING.TINY / 2,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  sectionContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});

// Add ArticleItem component outside of the main component
const ArticleItem = memo(
  ({ article, onPress }: { article: Article; onPress: (article: Article) => void }) => {
    const categoryName = article.category?.name
      ? capitalizeFirstLetter(article.category.name)
      : 'Uncategorized';

    const isDarkMode = useIsDarkMode();

    // Format time directly without TimeAgo component
    const timeAgoText = formatTimeAgo(article.created_at);

    return (
      <View style={[styles.articleContainer, styles.articleItemPadding]}>
        <BaseCard onPress={() => onPress(article)} style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText
                type="bodyBold"
                numberOfLines={2}
                colorName="text"
                weight="600"
                style={styles.titleText}
              >
                {article.title}
              </ThemedText>
              <ThemedText
                type="caption"
                colorName="textTertiary"
                numberOfLines={1}
                style={styles.metadataText}
              >
                {categoryName} · {timeAgoText} · by {article.author?.name || 'Anonymous'}
              </ThemedText>
            </View>
            <View style={styles.iconContainer}>
              <ThemedText
                type="label"
                colorName="textTertiary"
                variant={isDarkMode ? 'primary' : 'secondary'}
                style={styles.arrowText}
              >
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

export default function ArticlesScreen(): JSX.Element {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // Fetch in-progress articles when component mounts
  useEffect(() => {
    dispatch(fetchInProgressArticles());
  }, [dispatch]);

  // Use the new loading state hook
  const { isLoading: isLoadingState } = useLoadingState();

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
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  // Configure router screen options to disable animations on initial load
  useEffect(() => {
    // Set screen options programmatically to disable slide animation
    router.setParams({
      animation: 'none',
    });
  }, []);

  // Simple loading state - only show loading on initial data load
  const isInitialLoading = isArticlesLoading && articlesData.length === 0;

  // Use React Query for categories with longer cache times
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: 1800000,
    gcTime: 3600000,
    retry: 3,
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
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get inProgressArticles from Redux
  const { inProgressArticles = [], lastOpenedArticles = {} } = useAppSelectorMemo(
    state => state.readingList
  );

  // Get the daily pick state from Redux
  const { dailyPick } = useAppSelectorMemo(state => state.featuredContent);

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
        const aDate = lastOpenedArticles?.[a.id] || '';
        const bDate = lastOpenedArticles?.[b.id] || '';
        const aTime = aDate ? new Date(aDate).getTime() : 0;
        const bTime = bDate ? new Date(bDate).getTime() : 0;

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

    // Add haptic feedback for better user experience
    mediumFeedback();

    // Start refresh
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
      // End refresh with a bit of delay for a smoother transition
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  }, [queryClient, isFetching]);

  const handleArticlePress = useCallback((article: Article) => {
    // Navigate to article detail
    router.push(`/article/${article.id}`);
  }, []);

  const handleSelectAuthor = useCallback((authorId: number) => {
    // Use simple direct URL string for consistent behavior across platforms
    router.push(`/filter?type=author&id=${authorId}`);
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    // Use simple direct URL string for consistent behavior across platforms
    router.push(`/filter?type=category&id=${categoryId}`);
  }, []);

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
      if (dailyPickArticle?.id && today) {
        dispatch(setDailyPick({ articleId: Number(dailyPickArticle.id), date: today }));
      }
    }
  }, [articlesData, articlesError, dailyPick.date, dispatch]);

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

    // Map SimpleArticle to Article
    const mappedArticles = sortedInProgressArticles.map(article => ({
      ...article,
      author: null,
      content_hash: '',
      difficulty_level: 0,
      source: '',
      summary: '',
      category: undefined,
      word_timings: [],
    }));

    return (
      <ArticleSection
        title="Continue Reading"
        articles={mappedArticles}
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
        {latestArticles.map(article => (
          <ArticleItem key={article.id} article={article} onPress={handleArticlePress} />
        ))}
      </View>
    );
  }, [articlesData, handleArticlePress]);

  const BeginnerFriendlySection = useMemo(() => {
    if (beginnerArticles.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <SectionTitle title="Beginner Friendly" />
        <View style={styles.beginnerContainer}>
          <FlashList
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
            estimatedItemSize={200}
          />
        </View>
      </View>
    );
  }, [beginnerArticles, handleArticlePress]);

  const AuthorFilterSection = useMemo(() => {
    return (
      <View style={styles.filterSectionContainer}>
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
      <View style={styles.filterSectionContainer}>
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
      { id: 'daily-pick', component: DailyPick },
      { id: 'continue-reading', component: ContinueReadingSection },
      { id: 'latest-texts', component: LatestTextsSection },
      { id: 'beginner-friendly', component: BeginnerFriendlySection },
      { id: 'author-filter', component: AuthorFilterSection },
      { id: 'category-filter', component: CategoryFilterSection },
    ];

    return (
      <>
        {orderedSections
          .filter(section => section.component !== null)
          .map(section => (
            <React.Fragment key={section.id}>{section.component}</React.Fragment>
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
    // Return null when there's no content to display
    return null;
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
      paddingTop: getHeaderHeight(insets), // Match vocabulary.tsx exactly
    }),
    [insets, colors.background]
  );

  // Show loading screen only during first data load
  if (isInitialLoading) {
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

  // Main content view without any loading overlay
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
          ListHeaderComponent={isArticlesLoading && !isDataCached ? null : ListHeaderComponent}
          ListEmptyComponent={EmptyStateComponent}
          contentContainerStyle={contentContainerStyle}
          hideMainList={isArticlesLoading && !isDataCached ? true : false}
          hideWhileRefreshing={false}
        />
        <PageHeader title="Texts" />
      </ThemedView>
    </Animated.View>
  );
}
