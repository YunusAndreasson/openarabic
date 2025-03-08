import { StyleSheet, View, Pressable } from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen } from '@/components/Loader';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Tables } from '@/types/database.types';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import SectionTitle from '@/components/SectionTitle';
import ArticleList from '@/components/ArticleList';
import { fetchInProgressArticles, addToReadingList } from '@/store/readingListSlice';
import { useAuth } from '@/hooks/useAuth';
import { getDayOfYear } from '@/utils/dateUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import {
  filterArticles,
  getRecentArticles,
  getLatestArticles,
  getFeaturedArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '@/utils/articleUtils';
import { FlatList } from 'react-native';

// Constants

// Create a supabase client for fetching authors directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles before components that use them
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
  },

  categorySection: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  featuredSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: 0,
  },
  dailyPickSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: 0,
  },
  horizontalList: {
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  featuredCard: {
    width: '100%',
  },
  dailyPickCard: {
    width: '100%',
  },
  authorListContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  clearFilterText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
  },
  clearFilterButton: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorPill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    marginRight: LAYOUT.SPACING.SMALL,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.SHADOW.SMALL,
  },
  authorPillSelected: {
    ...LAYOUT.SHADOW.MEDIUM,
    transform: [{ scale: 1.02 }],
  },
  authorPillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  filterNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
    marginVertical: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
  },
  filterNoticeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginLeft: LAYOUT.SPACING.TINY,
    fontWeight: '500',
  },
  categoryListContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  paddingHorizontal: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  featuredItemMargin: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  horizontalListWithPadding: {
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  authorFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: LAYOUT.SCREEN_EDGE_PADDING,
  },
  boldText: {
    fontWeight: '600',
  },
  backArrow: {
    fontSize: 16,
  },
});

// Empty state components
const ErrorState = React.memo(({ message }: { message: string }) => (
  <View style={styles.emptyContainer}>
    <ThemedText style={styles.emptyText}>{message}</ThemedText>
  </View>
));
ErrorState.displayName = 'ErrorState';

// Daily Pick Component
const DailyPick = React.memo(
  ({
    articles,
    onArticlePress,
  }: {
    articles: Article[];
    onArticlePress: (article: Article) => void;
  }) => {
    // Get daily pick based on date (changes daily but same for all users)
    const dailyPick = useMemo(() => {
      return getDailyPickArticle(articles, getDayOfYear());
    }, [articles]);

    if (!dailyPick) return null;

    return (
      <Animated.View style={styles.dailyPickSection} entering={FadeIn.duration(600)}>
        <SectionTitle title="Daily Pick" />
        <View style={styles.paddingHorizontal}>
          <ThemedCard
            imageUrl={dailyPick.image_url || 'https://picsum.photos/800/400'}
            title={dailyPick.title}
            category={dailyPick.category?.name ?? 'Uncategorized'}
            author={dailyPick.author?.name ?? 'Anonymous'}
            onPress={() => onArticlePress(dailyPick)}
            style={styles.dailyPickCard}
          />
        </View>
      </Animated.View>
    );
  }
);
DailyPick.displayName = 'DailyPick';

// Category Section Component
const CategorySection = React.memo(
  ({
    title,
    articles,
    onArticlePress,
    delay = 0,
    showTimeAgo = false,
  }: {
    title: string;
    articles: Article[];
    onArticlePress: (article: Article) => void;
    delay?: number;
    showTimeAgo?: boolean;
  }) => {
    // Capitalize the first letter of each word in a title
    const displayTitle = title
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (articles.length === 0) return null;

    return (
      <Animated.View style={styles.categorySection} entering={FadeIn.duration(500).delay(delay)}>
        <SectionTitle title={displayTitle} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={articles}
          keyExtractor={article => `article-${article.id}`}
          renderItem={({ item }) => (
            <CompactArticleCard
              article={item}
              onPress={() => onArticlePress(item)}
              showTimeAgo={showTimeAgo}
            />
          )}
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </Animated.View>
    );
  }
);
CategorySection.displayName = 'CategorySection';

// Featured Articles Component
const FeaturedArticles = React.memo(
  ({
    articles,
    onArticlePress,
  }: {
    articles: Article[];
    onArticlePress: (article: Article) => void;
  }) => {
    if (articles.length === 0) return null;

    return (
      <Animated.View style={styles.featuredSection} entering={FadeIn.duration(500).delay(300)}>
        <SectionTitle title="Featured Articles" />
        <View style={styles.paddingHorizontal}>
          {articles.map((article, index) => (
            <Animated.View
              key={`featured-${article.id}`}
              style={index < articles.length - 1 ? styles.featuredItemMargin : undefined}
              entering={FadeIn.duration(400).delay(300 + index * 100)}
            >
              <ThemedCard
                imageUrl={article.image_url || 'https://picsum.photos/800/400'}
                title={article.title}
                category={article.category?.name ?? 'Uncategorized'}
                author={article.author?.name ?? 'Anonymous'}
                onPress={() => onArticlePress(article)}
                style={styles.featuredCard}
              />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    );
  }
);
FeaturedArticles.displayName = 'FeaturedArticles';

// Continue Reading Section Component
const ContinueReadingSection = React.memo(
  ({
    articles,
    onArticlePress,
  }: {
    articles: Article[];
    onArticlePress: (article: Article) => void;
  }) => {
    // Don't render the section if there are no articles
    if (articles.length === 0) return null;

    return (
      <Animated.View style={styles.categorySection} entering={FadeIn.duration(500).delay(100)}>
        <SectionTitle title="Continue Reading" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          data={articles}
          keyExtractor={article => `reading-${article.id}`}
          renderItem={({ item }) => (
            <CompactArticleCard article={item} onPress={() => onArticlePress(item)} />
          )}
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </Animated.View>
    );
  }
);
ContinueReadingSection.displayName = 'ContinueReadingSection';

// Author Filter List Component
const AuthorFilterList = React.memo(
  ({
    authors,
    selectedAuthorId,
    onSelectAuthor,
    onClearFilter,
  }: {
    authors: Tables<'authors'>[];
    selectedAuthorId: number | null;
    onSelectAuthor: (authorId: number) => void;
    onClearFilter: () => void;
  }) => {
    const colors = useColors();

    // Get styles for author pill based on selection state
    const getAuthorPillStyle = useCallback(
      (isSelected: boolean, pressed: boolean) => [
        styles.authorPill,
        {
          backgroundColor: isSelected
            ? colors.textOverlay
            : pressed
              ? colors.background
              : colors.cardBackground,
        },
        isSelected && styles.authorPillSelected,
      ],
      [colors.textOverlay, colors.background, colors.cardBackground]
    );

    // Get styles for author pill text based on selection state
    const getAuthorPillTextStyle = useCallback(
      (isSelected: boolean) => [
        styles.authorPillText,
        isSelected && [{ color: colors.tint }, styles.boldText],
      ],
      [colors.tint]
    );

    // Render an author pill
    const renderAuthorItem = useCallback(
      ({ item }: { item: Tables<'authors'> }) => {
        const isSelected = selectedAuthorId === item.id;
        return (
          <Animated.View
            key={`author-pill-${item.id}`}
            entering={FadeIn.duration(LAYOUT.ANIMATION.DURATION.FAST).delay(650)}
          >
            <Pressable
              style={({ pressed }) => getAuthorPillStyle(isSelected, pressed)}
              onPress={() => onSelectAuthor(item.id)}
            >
              <ThemedText
                style={getAuthorPillTextStyle(isSelected)}
                numberOfLines={1}
                ellipsizeMode="tail"
                skipDefaultColor={isSelected}
              >
                {item.name}
              </ThemedText>
            </Pressable>
          </Animated.View>
        );
      },
      [selectedAuthorId, onSelectAuthor, getAuthorPillStyle, getAuthorPillTextStyle]
    );

    // Skip rendering if no authors
    if (authors.length === 0) return null;

    // Use pills for authors
    return (
      <Animated.View
        style={[styles.authorListContainer]}
        entering={FadeIn.duration(LAYOUT.ANIMATION.DURATION.NORMAL).delay(600)}
      >
        <View style={styles.authorFilterHeader}>
          <SectionTitle title="Browse by Author" />
          {selectedAuthorId !== null && (
            <Pressable
              style={[styles.clearFilterButton, { backgroundColor: colors.textOverlay }]}
              onPress={onClearFilter}
            >
              <ThemedText style={[styles.clearFilterText, { color: colors.tint }]} skipDefaultColor>
                Clear
              </ThemedText>
            </Pressable>
          )}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.horizontalList, styles.horizontalListWithPadding]}
          data={authors}
          keyExtractor={author => `author-${author.id}`}
          renderItem={renderAuthorItem}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={20}
          windowSize={5}
        />
      </Animated.View>
    );
  }
);
AuthorFilterList.displayName = 'AuthorFilterList';

// Filter Notice Component
const FilterNotice = React.memo(({ type, name }: { type: 'author' | 'category'; name: string }) => {
  const colors = useColors();

  return (
    <View style={[styles.filterNoticeContainer, { backgroundColor: colors.textOverlay }]}>
      <ThemedText style={styles.filterNoticeText}>
        Showing articles from {type === 'author' ? 'author' : 'category'}{' '}
        <ThemedText style={[styles.boldText, { color: colors.tint }]} skipDefaultColor>
          {name}
        </ThemedText>
      </ThemedText>
    </View>
  );
});
FilterNotice.displayName = 'FilterNotice';

// Back Button Component
const BackButton = React.memo(({ onPress }: { onPress: () => void }) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <View style={styles.backButtonContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: colors.textOverlay,
            opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1,
          },
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Back to home"
      >
        <ThemedText style={[styles.backArrow, { color: colors.tint }]} skipDefaultColor>
          ←
        </ThemedText>
        <ThemedText style={[styles.backButtonText, { color: colors.tint }]} skipDefaultColor>
          Back to home
        </ThemedText>
      </Pressable>
    </View>
  );
});
BackButton.displayName = 'BackButton';

// Category Filter List Component
const CategoryFilterList = React.memo(
  ({
    categories,
    selectedCategoryId,
    onSelectCategory,
  }: {
    categories: Tables<'categories'>[];
    selectedCategoryId: number | null;
    onSelectCategory: (categoryId: number) => void;
  }) => {
    const colors = useColors();

    // Get styles for category pill based on selection state
    const getCategoryPillStyle = useCallback(
      (isSelected: boolean, pressed: boolean) => [
        styles.authorPill,
        {
          backgroundColor: isSelected
            ? colors.textOverlay
            : pressed
              ? colors.background
              : colors.cardBackground,
        },
        isSelected && styles.authorPillSelected,
      ],
      [colors.textOverlay, colors.background, colors.cardBackground]
    );

    // Get styles for category pill text based on selection state
    const getCategoryPillTextStyle = useCallback(
      (isSelected: boolean) => [
        styles.authorPillText,
        isSelected && [{ color: colors.tint }, styles.boldText],
      ],
      [colors.tint]
    );

    // Render a category pill
    const renderCategoryItem = useCallback(
      ({ item }: { item: Tables<'categories'> }) => {
        const isSelected = selectedCategoryId === item.id;
        return (
          <Animated.View
            key={`category-pill-${item.id}`}
            entering={FadeIn.duration(LAYOUT.ANIMATION.DURATION.FAST).delay(750)}
          >
            <Pressable
              style={({ pressed }) => getCategoryPillStyle(isSelected, pressed)}
              onPress={() => onSelectCategory(item.id)}
            >
              <ThemedText
                style={getCategoryPillTextStyle(isSelected)}
                numberOfLines={1}
                ellipsizeMode="tail"
                skipDefaultColor={isSelected}
              >
                {capitalizeFirstLetter(item.name)}
              </ThemedText>
            </Pressable>
          </Animated.View>
        );
      },
      [selectedCategoryId, onSelectCategory, getCategoryPillStyle, getCategoryPillTextStyle]
    );

    // Skip rendering if no categories
    if (categories.length === 0) return null;

    // Use pills for categories
    return (
      <Animated.View
        style={[styles.categoryListContainer]}
        entering={FadeIn.duration(LAYOUT.ANIMATION.DURATION.NORMAL).delay(700)}
      >
        <SectionTitle title="Browse by Category" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.horizontalList, styles.horizontalListWithPadding]}
          data={categories}
          keyExtractor={category => `category-${category.id}`}
          renderItem={renderCategoryItem}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={20}
          windowSize={5}
        />
      </Animated.View>
    );
  }
);
CategoryFilterList.displayName = 'CategoryFilterList';

export default function ArticlesScreen() {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const { session } = useAuth();

  // Refs
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedRef = useRef(false);

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [authors, setAuthors] = useState<Tables<'authors'>[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Get inProgressArticles from Redux
  const { inProgressArticles } = useAppSelectorMemo(state => state.readingList);

  // Define fetchAuthors and fetchCategories functions
  const fetchAuthors = useCallback(async () => {
    try {
      const { data } = await supabase.from('authors').select('*');
      setAuthors(data || []);
    } catch (_err) {
      // Error handling is silent as it's not critical
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesData = await categoriesService.getCategories();
      setCategories(categoriesData);
    } catch (_err) {
      // Don't set error state here, as it's not critical
    }
  }, []);

  // Add an effect to fetch in-progress articles when the component mounts
  useEffect(() => {
    dispatch(fetchInProgressArticles());
  }, [dispatch]);

  // Add effects to fetch authors and categories when the component mounts
  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Is in filtered view (either by author or category)
  const isInFilteredView = useMemo(
    () => selectedAuthorId !== null || selectedCategoryId !== null,
    [selectedAuthorId, selectedCategoryId]
  );

  // Get selected author name
  const selectedAuthor = useMemo(() => {
    if (selectedAuthorId === null) return null;
    return authors.find(author => author.id === selectedAuthorId) || null;
  }, [selectedAuthorId, authors]);

  // Get selected category name
  const selectedCategory = useMemo(() => {
    if (selectedCategoryId === null) return null;
    return categories.find(category => category.id === selectedCategoryId) || null;
  }, [selectedCategoryId, categories]);

  // Filter articles by selected author or category
  const filteredArticles = useMemo(() => {
    return filterArticles(articles, selectedAuthorId, selectedCategoryId);
  }, [articles, selectedAuthorId, selectedCategoryId]);

  // Organized articles by category
  const recentArticles = useMemo(() => getRecentArticles(filteredArticles), [filteredArticles]);
  const latestArticles = useMemo(() => getLatestArticles(filteredArticles), [filteredArticles]);
  const featuredArticles = useMemo(() => getFeaturedArticles(filteredArticles), [filteredArticles]);
  const beginnerArticles = useMemo(() => getBeginnerArticles(filteredArticles), [filteredArticles]);

  // Refined content container style for consistent spacing
  const contentContainerStyle = useMemo(
    () => ({
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: 0,
    }),
    [colors.background]
  );

  // Fetch data function
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Only pass the ID if it's not null
      const categoryId = selectedCategoryId !== null ? selectedCategoryId : undefined;
      const authorId = selectedAuthorId !== null ? selectedAuthorId : undefined;

      const fetchedArticles = await articlesService.getArticles(categoryId, authorId);
      setArticles(fetchedArticles);

      // Mark data as loaded
      dataLoadedRef.current = true;

      // Fetch authors and categories if they haven't been fetched yet
      if (authors.length === 0) {
        fetchAuthors();
      }

      if (categories.length === 0) {
        fetchCategories();
      }

      // Dispatch fetchInProgressArticles after fetching articles
      dispatch(fetchInProgressArticles());
    } catch (_err) {
      setError('Failed to load articles');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    selectedCategoryId,
    selectedAuthorId,
    dispatch,
    authors.length,
    categories.length,
    fetchAuthors,
    fetchCategories,
  ]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForceUpdate(true);
    fetchArticles();
  }, [fetchArticles]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      // Navigate to article detail
      router.push(`/article/${article.id}`);

      // Add to reading list if authenticated
      if (!session?.user) {
        // Skip adding to reading list if not authenticated
        return;
      }

      // Add to reading list
      dispatch(addToReadingList(article.id));
    },
    [dispatch, session?.user]
  );

  const handleSelectAuthor = useCallback((authorId: number) => {
    Haptics.selectionAsync();
    // Clear any category filter if active
    setSelectedCategoryId(null);
    setSelectedAuthorId(authorId);

    // Scroll to top when changing author
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    Haptics.selectionAsync();
    // Clear any author filter if active
    setSelectedAuthorId(null);
    setSelectedCategoryId(categoryId);

    // Scroll to top when changing category
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedAuthorId(null);
    setSelectedCategoryId(null);

    // Scroll to top when clearing filters
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  // Use focus effect to refresh data when tab becomes active, but only when necessary
  useFocusEffect(
    useCallback(() => {
      // Always fetch on first mount, then only when force update is requested
      if (isInitialMount.current || forceUpdate) {
        fetchArticles();
        if (forceUpdate) {
          setForceUpdate(false);
        }
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
      } else {
        // If we already have data but are still showing loading, make sure to hide it
        if (dataLoadedRef.current && isLoading) {
          setIsLoading(false);
        }
      }

      // Clean up any pending timeouts
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }, [fetchArticles, forceUpdate, isLoading])
  );

  // Create a header component for the FlatList
  const ListHeaderComponent = useCallback(() => {
    if (isInFilteredView) {
      return (
        <>
          <BackButton onPress={handleClearFilters} />
          {selectedAuthor && <FilterNotice type="author" name={selectedAuthor.name} />}
          {selectedCategory && <FilterNotice type="category" name={selectedCategory.name} />}
        </>
      );
    }

    return (
      <>
        <DailyPick articles={articles} onArticlePress={handleArticlePress} />

        <ContinueReadingSection articles={inProgressArticles} onArticlePress={handleArticlePress} />

        {latestArticles.length > 0 && (
          <CategorySection
            title="Latest Articles"
            articles={latestArticles}
            onArticlePress={handleArticlePress}
            delay={150}
            showTimeAgo={true}
          />
        )}

        {featuredArticles.length > 0 && (
          <FeaturedArticles articles={featuredArticles} onArticlePress={handleArticlePress} />
        )}

        {recentArticles.length > 0 && (
          <CategorySection
            title="Recently Added"
            articles={recentArticles}
            onArticlePress={handleArticlePress}
            delay={300}
          />
        )}

        {beginnerArticles.length > 0 && (
          <CategorySection
            title="Beginner Friendly"
            articles={beginnerArticles}
            onArticlePress={handleArticlePress}
            delay={400}
          />
        )}

        {/* Author filter list */}
        <AuthorFilterList
          authors={authors}
          selectedAuthorId={selectedAuthorId}
          onSelectAuthor={handleSelectAuthor}
          onClearFilter={handleClearFilters}
        />

        {/* Category filter list */}
        <CategoryFilterList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />
      </>
    );
  }, [
    isInFilteredView,
    selectedAuthor,
    selectedCategory,
    articles,
    inProgressArticles,
    latestArticles,
    featuredArticles,
    recentArticles,
    beginnerArticles,
    authors,
    categories,
    selectedAuthorId,
    selectedCategoryId,
    handleClearFilters,
    handleArticlePress,
    handleSelectAuthor,
    handleSelectCategory,
  ]);

  // Create an empty state component
  const EmptyStateComponent = useCallback(() => {
    // Return an empty fragment instead of null to satisfy the type requirement
    return <></>;
  }, []);

  // Show loading screen if no data yet
  if (isLoading && !isRefreshing && articles.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['top', 'left', 'right']}
      accessibilityLabel="Articles browse screen"
      accessibilityRole="scrollbar"
    >
      {error ? (
        <ErrorState message={error} />
      ) : (
        <ArticleList
          articles={isInFilteredView ? filteredArticles : []}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onArticlePress={handleArticlePress}
          ListHeaderComponent={ListHeaderComponent()}
          ListEmptyComponent={EmptyStateComponent()}
          contentContainerStyle={contentContainerStyle}
        />
      )}
    </ThemedView>
  );
}
