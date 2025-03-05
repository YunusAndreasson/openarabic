import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  Platform,
  View,
  RefreshControl,
  ScrollView,
  Pressable,
} from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { readingListService } from '@/services/readingList';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen } from '@/components/Loader';
import { useAppSelectorMemo } from '@/store/hooks';
import { Theme } from '@/constants/Colors';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Tables } from '@/types/database.types';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import type { CategoryItem } from '@/components/CategorySelector';
import { Image } from 'expo-image';

// Constants
const ITEM_HEIGHT = 360;

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
  articleItemContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  articleCard: {
    width: '100%',
  },
  itemSeparator: {
    height: LAYOUT.SPACING.MEDIUM,
  },
  categorySection: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  featuredSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  dailyPickSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  progressIndicator: {
    backgroundColor: '#FF9500',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: 'white',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '700',
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
  welcomeContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  welcomeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: 0.7,
  },
  authorContainer: {
    marginRight: LAYOUT.SPACING.SMALL,
    width: 220,
  },
  authorName: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
  // Author filter list styles
  authorListContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  authorListHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  clearFilterButton: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  clearFilterText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
  },
  authorItem: {
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: 80,
  },
  authorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: LAYOUT.SPACING.SMALL,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  authorAvatarSelected: {
    borderWidth: 3,
  },
  authorPill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: 20,
    marginRight: LAYOUT.SPACING.SMALL,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 2,
    elevation: 2,
  },
  authorPillSelected: {
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  authorPillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    textAlign: 'center',
  },
  authorNameText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  filterNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
    marginVertical: LAYOUT.SPACING.LARGE,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
  },
  filterNoticeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    opacity: 0.8,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginLeft: LAYOUT.SPACING.TINY,
    fontWeight: '500',
  },
  // Category filter list styles
  categoryListContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  endMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  endMessageText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
    opacity: 0.5,
  },
});

// Empty state components
const EmptyState = React.memo(() => (
  <View style={styles.emptyContainer}>
    <ThemedText style={styles.emptyText}>No articles available right now</ThemedText>
  </View>
));

const ErrorState = React.memo(({ message }: { message: string }) => (
  <View style={styles.emptyContainer}>
    <ThemedText style={styles.emptyText}>{message}</ThemedText>
  </View>
));

// Daily Pick Component
const DailyPick = React.memo(
  ({
    articles,
    onArticlePress,
  }: {
    articles: Article[];
    onArticlePress: (article: Article) => void;
  }) => {
    const colors = useColors();

    // Get daily pick based on date (changes daily but same for all users)
    const dailyPick = useMemo(() => {
      if (articles.length === 0) return null;

      const today = new Date();
      const dayOfYear = Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
      );
      const pickIndex = dayOfYear % articles.length;

      return articles[pickIndex];
    }, [articles]);

    if (!dailyPick) return null;

    return (
      <Animated.View style={styles.dailyPickSection} entering={FadeIn.duration(600)}>
        <ThemedText style={styles.sectionTitle}>Daily Pick</ThemedText>
        <ThemedCard
          imageUrl={dailyPick.image_url || 'https://picsum.photos/800/400'}
          title={dailyPick.title}
          category={dailyPick.category?.name ?? 'Uncategorized'}
          author={dailyPick.author?.name ?? 'Anonymous'}
          onPress={() => onArticlePress(dailyPick)}
          style={styles.dailyPickCard}
        />
      </Animated.View>
    );
  }
);

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
    const scrollX = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler(event => {
      scrollX.value = event.contentOffset.x;
    });

    if (articles.length === 0) return null;

    // Capitalize the first letter of each word in a title
    const displayTitle = title
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return (
      <Animated.View style={styles.categorySection} entering={FadeIn.duration(500).delay(delay)}>
        <ThemedText style={styles.sectionTitle}>{displayTitle}</ThemedText>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          entering={FadeIn.duration(400).delay(delay + 100)}
        >
          {articles.map(article => (
            <CompactArticleCard
              key={`article-${article.id}`}
              article={article}
              onPress={() => onArticlePress(article)}
              showTimeAgo={showTimeAgo}
            />
          ))}
        </Animated.ScrollView>
      </Animated.View>
    );
  }
);

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
        <ThemedText style={styles.sectionTitle}>Featured Articles</ThemedText>

        {articles.map((article, index) => (
          <Animated.View
            key={`featured-${article.id}`}
            style={{ marginBottom: index < articles.length - 1 ? LAYOUT.SPACING.MEDIUM : 0 }}
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
      </Animated.View>
    );
  }
);

// Continue Reading Section Component
const ContinueReadingSection = React.memo(
  ({
    articles,
    onArticlePress,
  }: {
    articles: Article[];
    onArticlePress: (article: Article) => void;
  }) => {
    if (articles.length === 0) return null;

    return (
      <Animated.View style={styles.categorySection} entering={FadeIn.duration(500).delay(200)}>
        <View style={styles.sectionHeaderWithIcon}>
          <ThemedText style={styles.sectionTitle}>Continue Reading</ThemedText>
          <View style={styles.progressIndicator}>
            <ThemedText style={styles.progressText} skipDefaultColor>
              {articles.length}
            </ThemedText>
          </View>
        </View>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={true}
          entering={FadeIn.duration(400).delay(300)}
        >
          {articles.map(article => (
            <CompactArticleCard
              key={article.id.toString()}
              article={article}
              onPress={() => onArticlePress(article)}
            />
          ))}
        </Animated.ScrollView>
      </Animated.View>
    );
  }
);

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

    // Skip rendering if no authors
    if (authors.length === 0) return null;

    // Use pills for authors
    return (
      <Animated.View
        style={[
          styles.authorListContainer,
          {
            borderTopColor: colors.cardBorder,
            borderBottomColor: colors.cardBorder,
          },
        ]}
        entering={FadeIn.duration(500).delay(600)}
      >
        <View style={styles.authorListHeaderContainer}>
          <ThemedText style={styles.sectionTitle}>Browse by Author</ThemedText>
          {selectedAuthorId !== null && (
            <Pressable
              style={[styles.clearFilterButton, { backgroundColor: `${colors.tint}20` }]}
              onPress={onClearFilter}
            >
              <ThemedText style={[styles.clearFilterText, { color: colors.tint }]} skipDefaultColor>
                Clear
              </ThemedText>
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={true}
        >
          {authors.map(author => {
            const isSelected = selectedAuthorId === author.id;
            return (
              <Animated.View
                key={`author-pill-${author.id}`}
                entering={FadeIn.duration(300).delay(650)}
              >
                <Pressable
                  style={[
                    styles.authorPill,
                    { backgroundColor: isSelected ? `${colors.tint}15` : colors.cardBackground },
                    isSelected && styles.authorPillSelected,
                  ]}
                  onPress={() => onSelectAuthor(author.id)}
                >
                  <ThemedText
                    style={[
                      styles.authorPillText,
                      isSelected && { color: colors.tint, fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    skipDefaultColor={isSelected}
                  >
                    {author.name}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  }
);

// Filter Notice Component
const FilterNotice = React.memo(({ type, name }: { type: 'author' | 'category'; name: string }) => {
  const colors = useColors();

  return (
    <View style={[styles.filterNoticeContainer, { backgroundColor: `${colors.tint}10` }]}>
      <ThemedText style={styles.filterNoticeText}>
        Showing articles from {type === 'author' ? 'author' : 'category'}{' '}
        <ThemedText style={{ fontWeight: '600' }}>{name}</ThemedText>
      </ThemedText>
    </View>
  );
});

// Back Button Component
const BackButton = React.memo(({ onPress }: { onPress: () => void }) => {
  const colors = useColors();

  return (
    <View style={styles.backButtonContainer}>
      <Pressable
        style={[styles.backButton, { backgroundColor: `${colors.tint}20` }]}
        onPress={onPress}
      >
        <ThemedText style={[{ color: colors.tint }, { fontSize: 16 }]} skipDefaultColor>
          ←
        </ThemedText>
        <ThemedText style={[styles.backButtonText, { color: colors.tint }]} skipDefaultColor>
          Back to home
        </ThemedText>
      </Pressable>
    </View>
  );
});

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

    // Skip rendering if no categories
    if (categories.length === 0) return null;

    // Use pills for categories
    return (
      <Animated.View
        style={[
          styles.categoryListContainer,
          {
            borderTopColor: colors.cardBorder,
            borderBottomColor: colors.cardBorder,
          },
        ]}
        entering={FadeIn.duration(500).delay(700)}
      >
        <View style={styles.authorListHeaderContainer}>
          <ThemedText style={styles.sectionTitle}>Browse by Category</ThemedText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={true}
        >
          {categories.map(category => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <Animated.View
                key={`category-pill-${category.id}`}
                entering={FadeIn.duration(300).delay(750)}
              >
                <Pressable
                  style={[
                    styles.authorPill,
                    { backgroundColor: isSelected ? `${colors.tint}15` : colors.cardBackground },
                    isSelected && styles.authorPillSelected,
                  ]}
                  onPress={() => onSelectCategory(category.id)}
                >
                  <ThemedText
                    style={[
                      styles.authorPillText,
                      isSelected && { color: colors.tint, fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    skipDefaultColor={isSelected}
                  >
                    {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  }
);

// End Message Component
const EndMessage = React.memo(() => {
  return (
    <Animated.View style={styles.endMessageContainer} entering={FadeIn.duration(500).delay(800)}>
      <ThemedText style={styles.endMessageText}>
        You've reached the end of your personalized reading selection
      </ThemedText>
    </Animated.View>
  );
});

export default function ArticlesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Refs
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const isInitialMount = useRef(true);
  const loadingStartTime = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedRef = useRef(false);

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [inProgressArticles, setInProgressArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [authors, setAuthors] = useState<Tables<'authors'>[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

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
    if (selectedAuthorId !== null) {
      return articles.filter(article => article.author_id === selectedAuthorId);
    } else if (selectedCategoryId !== null) {
      return articles.filter(article => article.category_id === selectedCategoryId);
    }
    return articles;
  }, [articles, selectedAuthorId, selectedCategoryId]);

  // Organized articles by category
  const articlesByCategory = useMemo(() => {
    const result: Record<number, Article[]> = {};

    // Initialize categories
    categories.forEach(category => {
      result[category.id] = [];
    });

    // Group articles by category (using filtered articles if an author is selected)
    filteredArticles.forEach(article => {
      if (article.category_id && result[article.category_id]) {
        result[article.category_id].push(article);
      }
    });

    return result;
  }, [filteredArticles, categories]);

  // Recent articles (last 30 days)
  const recentArticles = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return filteredArticles
      .filter(article => {
        const articleDate = new Date(article.created_at);
        return articleDate >= thirtyDaysAgo;
      })
      .slice(0, 10);
  }, [filteredArticles]);

  // Latest articles - strictly sorted by creation date
  const latestArticles = useMemo(() => {
    return [...filteredArticles]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [filteredArticles]);

  // Featured articles (highest difficulty level)
  const featuredArticles = useMemo(() => {
    return [...filteredArticles]
      .sort((a, b) => b.difficulty_level - a.difficulty_level)
      .slice(0, 5);
  }, [filteredArticles]);

  // Beginner-friendly articles (lowest difficulty level)
  const beginnerArticles = useMemo(() => {
    return [...filteredArticles]
      .sort((a, b) => a.difficulty_level - b.difficulty_level)
      .slice(0, 10);
  }, [filteredArticles]);

  // Memoized content container style - fix iOS bottom padding
  const contentContainerStyle = useMemo(
    () => ({
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM,
    }),
    [colors.background, insets.bottom]
  );

  const fetchAuthors = useCallback(async () => {
    try {
      // Direct Supabase query to get authors
      const { data, error } = await supabase.from('authors').select('*');
      if (error) throw error;
      setAuthors(data || []);
    } catch (err) {
      console.error('Failed to fetch authors:', err);
    }
  }, []);

  const fetchReadingList = useCallback(async () => {
    try {
      // This is a placeholder - you'll need to implement the actual service
      const inProgress = await readingListService.getInProgressArticles();
      setInProgressArticles(inProgress);
    } catch (err) {
      console.error('Failed to fetch reading list:', err);
      // Don't set error state here, as it's not critical
      setInProgressArticles([]);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await categoriesService.getCategories();
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchArticles = useCallback(
    async (showRefreshing = false) => {
      // Clear any existing timeouts
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }

      try {
        if (showRefreshing) {
          setIsRefreshing(true);
        } else if (!isRefreshing) {
          setIsLoading(true);
          loadingStartTime.current = Date.now();
        }
        setError(null);

        const fetchedArticles = await articlesService.getArticles();
        setArticles(fetchedArticles);
        dataLoadedRef.current = true;

        // Also fetch categories if they haven't been fetched yet
        if (categories.length === 0) {
          fetchCategories();
        }

        // Fetch reading list
        fetchReadingList();

        // Fetch authors
        if (authors.length === 0) {
          fetchAuthors();
        }
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
        // Make sure to set loading states to false on error
        setIsLoading(false);
        setIsRefreshing(false);
      } finally {
        // Ensure loader shows for at least 500ms for a more consistent experience
        const timeElapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
        const remainingTime = Math.max(0, 500 - timeElapsed);

        if (remainingTime > 0 && !showRefreshing) {
          loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
            setIsRefreshing(false);
            loadingStartTime.current = null;
          }, remainingTime);
        } else {
          setIsLoading(false);
          setIsRefreshing(false);
          loadingStartTime.current = null;
        }
      }
    },
    [
      isRefreshing,
      categories.length,
      fetchCategories,
      fetchReadingList,
      authors.length,
      fetchAuthors,
    ]
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForceUpdate(true);
    fetchArticles(true);
  }, [fetchArticles]);

  const handleArticlePress = useCallback((article: Article) => {
    router.push(`/article/${article.id}`);
  }, []);

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

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }, [fetchArticles, forceUpdate, isLoading])
  );

  // Add scroll animation
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Generate random ordering for categories each day to keep UI fresh
  const shuffledCategories = useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    );

    // Create a copy of categories
    const catCopy = [...categories];

    // Use Fisher-Yates shuffle algorithm with day of year as seed
    for (let i = catCopy.length - 1; i > 0; i--) {
      // Use day of year to create a deterministic but changing shuffle
      const j = (i + dayOfYear) % (i + 1);
      [catCopy[i], catCopy[j]] = [catCopy[j], catCopy[i]];
    }

    return catCopy;
  }, [categories]);

  // Show loading screen if no data yet
  if (isLoading && !isRefreshing && articles.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        ref={scrollViewRef}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            progressBackgroundColor={colors.cardBackground}
            colors={[colors.tint]}
            tintColor={colors.tint}
          />
        }
      >
        {error ? (
          <ErrorState message={error} />
        ) : articles.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Show filter notice and back button when in filtered view */}
            {isInFilteredView && (
              <>
                <BackButton onPress={handleClearFilters} />
                {selectedAuthor && <FilterNotice type="author" name={selectedAuthor.name} />}
                {selectedCategory && <FilterNotice type="category" name={selectedCategory.name} />}
              </>
            )}

            {/* Show these sections only when not in filtered view */}
            {!isInFilteredView && (
              <>
                <DailyPick articles={articles} onArticlePress={handleArticlePress} />

                <ContinueReadingSection
                  articles={inProgressArticles}
                  onArticlePress={handleArticlePress}
                />

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
                  <FeaturedArticles
                    articles={featuredArticles}
                    onArticlePress={handleArticlePress}
                  />
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
            )}

            {/* Show filtered articles when in filtered view */}
            {isInFilteredView && filteredArticles.length > 0 && (
              <CategorySection
                title="Articles"
                articles={filteredArticles}
                onArticlePress={handleArticlePress}
                delay={150}
                showTimeAgo={true}
              />
            )}

            {/* Add a graceful end message */}
            <EndMessage />
          </>
        )}
      </Animated.ScrollView>
    </ThemedView>
  );
}
