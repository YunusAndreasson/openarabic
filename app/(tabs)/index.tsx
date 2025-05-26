import { useHeaderHeight } from '@react-navigation/elements';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo, useRef, JSX } from 'react';
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

import ErrorState from '../../components/ErrorState';

// Define styles before components that use them
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    flexGrow: 1,
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
    isFetching: isArticlesFetching,
    error: articlesError,
  } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: 300000,
    gcTime: 600000,
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

  // Check if user has any study words at all
  const { data: allStudyWords = [] } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { studyWordsFSRSService } = await import('@/services/studyWordsFSRS');
      return studyWordsFSRSService.getFSRSWords(user.id);
    },
    enabled: !!user?.id,
    staleTime: 300000,
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
    staleTime: 1800000,
    gcTime: 3600000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: () => authorsService.getAuthors(),
    staleTime: 1800000,
    gcTime: 3600000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isFetching = isArticlesFetching;

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isFetching) return;

    mediumFeedback();
    setIsRefreshing(true);

    try {
      await queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return (
            key === 'articles' ||
            key === 'categories' ||
            key === 'authors' ||
            key === 'struggling-words'
          );
        },
      });
    } finally {
      refreshTimeoutRef.current = setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  }, [queryClient, isFetching]);

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
      <DailyPickSection article={dailyPickArticle} onPress={handleArticlePress} showTitle={false} />
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
      <View style={{ marginBottom: LAYOUT.SPACING.XLARGE }}>
        <ArticleSection
          title="Start Your Journey"
          articles={beginnerArticles.slice(0, 10)}
          onArticlePress={handleArticlePress}
          hideDifficulty={true}
        />
      </View>
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
    const ids = new Set<number>();
    articlesData.forEach(article => {
      if (article.author?.id) ids.add(article.author.id);
    });
    return ids;
  }, [articlesData]);

  const categoryIdsWithArticles = useMemo(() => {
    const ids = new Set<number>();
    articlesData.forEach(article => {
      if (article.category?.id) ids.add(article.category.id);
    });
    return ids;
  }, [articlesData]);

  const authorsWithArticles = useMemo(() => {
    return authors.filter(author => authorIdsWithArticles.has(author.id));
  }, [authors, authorIdsWithArticles]);

  const categoriesWithArticles = useMemo(() => {
    return categoriesData.filter(category => categoryIdsWithArticles.has(category.id));
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

  const authorFilterComponent = useMemo(
    () =>
      authorsWithArticles.length > 0 ? (
        <FilterSection title="Authors" items={authorsWithArticles} onSelect={handleSelectAuthor} />
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
      { id: 'welcome', component: <WelcomeMessage /> },
      { id: 'daily-pick', component: DailyPick },
      { id: 'struggling-words', component: StrugglingWordsComponent },
      { id: 'learning-section', component: learningSection },
      { id: 'latest-texts', component: latestTextsSectionComponent },
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
    ContinueReadingSection,
    authorFilterComponent,
    categoryFilterComponent,
  ]);

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
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
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
      accessibilityLabel="Articles screen"
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
