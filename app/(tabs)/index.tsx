import { useHeaderHeight } from '@react-navigation/elements';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo, JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSection } from '@/components/article';
import ArticleList from '@/components/index/ArticleList';
import DailyPickSection from '@/components/index/DailyPickSection';
import FilterSection from '@/components/index/FilterSection';
import LatestTextsSection from '@/components/index/LatestTextsSection';
import StrugglingWordsSection from '@/components/index/StrugglingWordsSection';
import { DueWordsArticleSection } from '@/components/index/DueWordsArticleSection';
import { DifficultWordsArticleSection } from '@/components/index/DifficultWordsArticleSection';
import { LongReadsSection } from '@/components/index/LongReadsSection';
import { WelcomeMessage } from '@/components/index/WelcomeMessage';
import { authorsService } from '@/services/authors';
import { LAYOUT } from '@/constants/layout';
import { useScreenFocusRefresh } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useStrugglingWords } from '@/hooks/useStrugglingWords';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useArticlesByDueWords } from '@/hooks/useArticlesByDueWords';
import { useArticlesByDifficultWords } from '@/hooks/useArticlesByDifficultWords';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { setDailyPick } from '@/store/featuredContentSlice';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { updateLastOpenedArticle } from '@/store/readingListSlice';
import type { Article } from '@/types/articles.types';
import {
  filterArticles,
  getLatestArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '@/utils/articleUtils';
import { getDayOfYear } from '@/utils/dateUtils';
import { mediumFeedback } from '@/utils/haptics';
import { handleError } from '@/utils/errorHandling';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';

import ErrorState from '../../components/ErrorState';

// Define styles before components that use them
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

export default function ArticlesScreen(): JSX.Element {
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prefetchArticle } = useAppPreloader();

  const { hasEnoughArticles = false, dueWordRootIds = new Set() } = useArticlesByDueWords(
    user?.id,
    10
  );

  const {
    hasEnoughArticles: hasEnoughDifficultArticles = false,
    difficultWordRootIds = new Set(),
  } = useArticlesByDifficultWords(user?.id, 10);

  const {
    data: articlesData = [],
    isLoading: isArticlesLoading,
    error: articlesError,
  } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: 3600000, // 1 hour - articles update max once a day
    gcTime: 7200000, // 2 hours
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  const { words: strugglingWords, isLoading: isStrugglingWordsLoading } = useStrugglingWords({
    userId: user?.id,
    limit: 10,
    enabled: !!user?.id,
  });

  // Check if user has any study words at all - use optimized query
  const { data: allStudyWords = [] } = useQuery({
    queryKey: FSRS_QUERY_KEYS.all(user?.id || ''),
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(user.id, {
        forStats: true, // Only need basic stats, not full data
        limit: 1, // Just need to know if any exist
      });
    },
    enabled: !!user?.id,
    staleTime: 180000, // 3 minutes
    gcTime: 600000, // 10 minutes
  });

  const hasAnyStudyWords = allStudyWords.length > 0;

  useEffect(() => {
    router.setParams({
      animation: 'none',
    });
  }, []);

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: 86400000, // 24 hours - categories never change
    gcTime: 172800000, // 48 hours
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: () => authorsService.getAuthors(),
    staleTime: 86400000, // 24 hours - authors never change
    gcTime: 172800000, // 48 hours
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { lastOpenedArticles = {} } = useAppSelectorMemo(state => state.readingList);

  const { dailyPick } = useAppSelectorMemo(state => state.featuredContent);

  const filteredArticles = useMemo(() => {
    return filterArticles(articlesData, null, null);
  }, [articlesData]);

  const beginnerArticles = useMemo(() => getBeginnerArticles(filteredArticles), [filteredArticles]);

  const articleMap = useMemo(() => {
    const map = new Map<number, Article>();
    articlesData.forEach(article => {
      map.set(article.id, article);
    });
    return map;
  }, [articlesData]);

  const continueReadingArticles = useMemo(() => {
    const sortedIds = Object.entries(lastOpenedArticles)
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .map(([id]) => Number(id));
    const articles = sortedIds.map(id => articleMap.get(id)).filter(Boolean) as Article[];
    return articles.slice(0, 5);
  }, [lastOpenedArticles, articleMap]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      // Invalidate only the queries that need refreshing
      const queriesToInvalidate: (string | readonly string[])[] = [['articles'], ['categories']];

      if (user?.id) {
        queriesToInvalidate.push(
          ['readingList', user.id],
          FSRS_QUERY_KEYS.due(user.id),
          FSRS_QUERY_KEYS.all(user.id),
          ['struggling-words', user.id]
        );
      }

      await Promise.all(
        queriesToInvalidate.map(queryKey =>
          queryClient.invalidateQueries({
            queryKey: Array.isArray(queryKey) ? [...queryKey] : [queryKey],
          })
        )
      );
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Refresh failed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      dispatch(updateLastOpenedArticle(article.id));
      prefetchArticle(article.id);
      router.push(`/article/${article.id}`);
    },
    [dispatch, prefetchArticle]
  );

  const handleSelectAuthor = useCallback((authorId: number) => {
    router.push(`/filter?type=author&id=${authorId}`);
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    router.push(`/filter?type=category&id=${categoryId}`);
  }, []);

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

  const DailyPick = useMemo(() => {
    if (articlesError || articlesData.length === 0) return null;

    let dailyPickArticle: Article | null = null;
    if (dailyPick.articleId !== null) {
      dailyPickArticle = articlesData.find(article => article.id === dailyPick.articleId) || null;
    }

    return dailyPickArticle ? (
      <DailyPickSection article={dailyPickArticle} onPress={handleArticlePress} showTitle={true} />
    ) : null;
  }, [articlesData, articlesError, handleArticlePress, dailyPick.articleId]);

  const ContinueReadingSection = useMemo(() => {
    if (continueReadingArticles.length === 0) return null;
    return (
      <ArticleSection
        title="Continue Reading"
        articles={continueReadingArticles}
        onArticlePress={handleArticlePress}
        hideDifficulty={true}
        getLastOpenedAt={articleId => lastOpenedArticles?.[articleId]}
      />
    );
  }, [continueReadingArticles, lastOpenedArticles, handleArticlePress]);

  const StrugglingWordsComponent = useMemo(() => {
    if (!user?.id) return null;

    return <StrugglingWordsSection words={strugglingWords} isLoading={isStrugglingWordsLoading} />;
  }, [strugglingWords, isStrugglingWordsLoading, user?.id]);

  const BeginnerFriendlySection = useMemo(() => {
    // Only show beginner articles when user has no study words at all
    if (beginnerArticles.length === 0 || hasAnyStudyWords) return null;

    return (
      <ArticleSection
        title="Start Your Journey"
        articles={beginnerArticles.slice(0, 10)}
        onArticlePress={handleArticlePress}
        hideDifficulty={true}
      />
    );
  }, [beginnerArticles, handleArticlePress, hasAnyStudyWords]);

  // Add Due Words Section Component
  const DueWordsSection = useMemo(() => {
    // Only show if user is logged in
    if (!user?.id) return null;

    return (
      <DueWordsArticleSection
        userId={user.id}
        onArticlePress={handleArticlePress}
        limit={10}
        dueWordRootIds={dueWordRootIds}
      />
    );
  }, [user?.id, handleArticlePress, dueWordRootIds]);

  // Add Difficult Words Section Component
  const DifficultWordsSection = useMemo(() => {
    // Only show if user is logged in
    if (!user?.id) return null;

    return (
      <DifficultWordsArticleSection
        userId={user.id}
        onArticlePress={handleArticlePress}
        limit={10}
        difficultWordRootIds={difficultWordRootIds}
      />
    );
  }, [user?.id, handleArticlePress, difficultWordRootIds]);

  const latestArticlesForSection = useMemo(
    () => getLatestArticles(articlesData, 5, true),
    [articlesData]
  );

  const authorIdsWithArticles = useMemo(() => {
    const counts = new Map<number, number>();
    articlesData.forEach(article => {
      if (article.author?.id) {
        counts.set(article.author.id, (counts.get(article.author.id) || 0) + 1);
      }
    });
    return counts;
  }, [articlesData]);

  const categoryIdsWithArticles = useMemo(() => {
    const counts = new Map<number, number>();
    articlesData.forEach(article => {
      if (article.category?.id) {
        counts.set(article.category.id, (counts.get(article.category.id) || 0) + 1);
      }
    });
    return counts;
  }, [articlesData]);

  const authorsWithArticles = useMemo(() => {
    return authors
      .filter(author => authorIdsWithArticles.has(author.id))
      .map(author => ({
        ...author,
        count: authorIdsWithArticles.get(author.id) || 0,
      }));
  }, [authors, authorIdsWithArticles]);

  const categoriesWithArticles = useMemo(() => {
    return categoriesData
      .filter(category => categoryIdsWithArticles.has(category.id))
      .map(category => ({
        ...category,
        count: categoryIdsWithArticles.get(category.id) || 0,
      }));
  }, [categoriesData, categoryIdsWithArticles]);

  const latestTextsSectionComponent = useMemo(
    () =>
      latestArticlesForSection.length > 0 ? (
        <LatestTextsSection
          articles={latestArticlesForSection}
          onArticlePress={handleArticlePress}
        />
      ) : null,
    [latestArticlesForSection, handleArticlePress]
  );

  const longReadsSectionComponent = useMemo(
    () => (
      <LongReadsSection
        articles={articlesData}
        onArticlePress={handleArticlePress}
        limit={10}
        minReadingTime={1}
      />
    ),
    [articlesData, handleArticlePress]
  );

  const authorFilterComponent = useMemo(
    () =>
      authorsWithArticles.length > 0 ? (
        <FilterSection title="Scholars" items={authorsWithArticles} onSelect={handleSelectAuthor} />
      ) : null,
    [authorsWithArticles, handleSelectAuthor]
  );

  const categoryFilterComponent = useMemo(
    () =>
      categoriesWithArticles.length > 0 ? (
        <FilterSection
          title="Categories"
          items={categoriesWithArticles}
          onSelect={handleSelectCategory}
        />
      ) : null,
    [categoriesWithArticles, handleSelectCategory]
  );

  const ListHeaderComponent = useMemo(() => {
    // Determine which learning section to show based on user's progress
    let learningSection = null;

    if (hasEnoughArticles) {
      // Show due words section if user has enough articles with due words
      learningSection = DueWordsSection;
    } else if (hasEnoughDifficultArticles && hasAnyStudyWords) {
      // Show difficult words section if user has study words but not enough due words
      learningSection = DifficultWordsSection;
    } else if (!hasAnyStudyWords) {
      // Show beginner section only if user has no study words at all
      learningSection = BeginnerFriendlySection;
    }

    const orderedSections = [
      { id: 'daily-pick', component: DailyPick },
      { id: 'struggling-words', component: StrugglingWordsComponent },
      { id: 'learning-section', component: learningSection },
      { id: 'latest-texts', component: latestTextsSectionComponent },
      { id: 'long-reads', component: longReadsSectionComponent },
      { id: 'continue-reading', component: ContinueReadingSection },
      { id: 'author-filter', component: authorFilterComponent },
      { id: 'category-filter', component: categoryFilterComponent },
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
    hasEnoughArticles,
    hasEnoughDifficultArticles,
    hasAnyStudyWords,
    DailyPick,
    StrugglingWordsComponent,
    DueWordsSection,
    DifficultWordsSection,
    BeginnerFriendlySection,
    latestTextsSectionComponent,
    longReadsSectionComponent,
    ContinueReadingSection,
    authorFilterComponent,
    categoryFilterComponent,
  ]);

  const ListFooterComponent = useMemo(() => {
    return <WelcomeMessage />;
  }, []);

  const EmptyStateComponent = useMemo(() => null, []);

  const articlesQuery = queryClient.getQueryState(['articles']);
  const isDataCached = articlesQuery?.data !== undefined;

  useScreenFocusRefresh(queryClient, 'articles', undefined, 300000, true, false);
  useScreenFocusRefresh(queryClient, 'categories', undefined, 600000, true, false);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: headerHeight,
      paddingBottom:
        insets.bottom +
        LAYOUT.CONTENT_SPACING.BOTTOM +
        LAYOUT.BOTTOM_BAR.HEIGHT +
        LAYOUT.SPACING.MEDIUM,
    }),
    [colors.background, headerHeight, insets.bottom]
  );

  if (articlesError && !isRefreshing && !isDataCached) {
    return (
      <ErrorState
        message={
          articlesError instanceof Error ? articlesError.message : 'An unexpected error occurred'
        }
        onRetry={() => {
          handleRefresh();
        }}
      />
    );
  }

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="Read screen"
    >
      <ArticleList
        articles={[]}
        isLoading={isArticlesLoading}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onArticlePress={handleArticlePress}
        ListHeaderComponent={isArticlesLoading && !isDataCached ? null : ListHeaderComponent}
        ListFooterComponent={isArticlesLoading && !isDataCached ? null : ListFooterComponent}
        ListEmptyComponent={EmptyStateComponent}
        contentContainerStyle={contentContainerStyle}
        hideMainList={isArticlesLoading && !isDataCached}
        hideWhileRefreshing={false}
        progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
      />
    </ThemedView>
  );
}

// Export a hook to check if the articles and due words are loaded
export function useArticlesAndDueWordsLoaded() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if articles data is loaded
  const articlesQueryState = queryClient.getQueryState(['articles']);
  const articlesLoaded =
    articlesQueryState?.status === 'success' || articlesQueryState?.status === 'error'; // Consider error as "loaded" to avoid infinite loading

  // Determine due words loading state
  const { isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 10);

  // Use useMemo to prevent rerendering on every call
  return useMemo(() => {
    // If user is not authenticated, we only need to check articles
    if (!user?.id) return articlesLoaded;

    // If user is authenticated, we need both articles and due words loading to complete
    return articlesLoaded && !isDueWordsLoading;
  }, [articlesLoaded, isDueWordsLoading, user?.id]);
}
