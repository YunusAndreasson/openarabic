import {
  StyleSheet,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  FlatList,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { router, Link } from 'expo-router';
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
import { StatusBar } from 'expo-status-bar';
import { EnhancedImage } from '../../components/EnhancedImage';
import { CompactArticleCard } from '@/components/CompactArticleCard';
import { useFadeInAnimation } from '@/hooks/animations';
import { capitalizeFirstLetter } from '../../utils/stringUtils';
import SectionTitle from '../../components/SectionTitle';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import ArticleList from '../../components/ArticleList';
import {
  filterArticles,
  getRecentArticles,
  getLatestArticles,
  getFeaturedArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '../../utils/articleUtils';
import { getDayOfYear } from '../../utils/dateUtils';
import { fetchInProgressArticles, addToReadingList } from '../../store/readingListSlice';

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
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    opacity: 0.7,
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
    paddingLeft: LAYOUT.SPACING.MEDIUM,
    paddingRight: LAYOUT.SPACING.MEDIUM,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorPill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
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
  featuredArticleCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredArticleImageContainer: {
    width: 100,
    height: 100,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  featuredArticleImage: {
    width: '100%',
    height: '100%',
  },
  featuredArticleContentContainer: {
    flex: 1,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  featuredArticleCategory: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.6)',
  },
  featuredArticleTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    marginTop: LAYOUT.SPACING.TINY,
  },
  featuredArticleDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  compactCard: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: 200,
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

    // Use our custom fade-in animation
    const { animatedStyle: fadeInStyle, startAnimation: startFadeIn } = useFadeInAnimation(0, 600);

    useEffect(() => {
      startFadeIn();
    }, [startFadeIn]);

    if (!dailyPick) return null;

    return (
      <Animated.View style={[styles.dailyPickSection, fadeInStyle]}>
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

    // Add our fade-in animation hook
    const { animatedStyle, startAnimation } = useFadeInAnimation(delay, 500);

    // Start the animation
    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    if (articles.length === 0) return null;

    return (
      <Animated.View style={[styles.categorySection, animatedStyle]}>
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
        />
      </Animated.View>
    );
  }
);
CategorySection.displayName = 'CategorySection';

// Create a separate FeaturedArticleItem component to handle individual animations
const FeaturedArticleItem = React.memo(
  ({
    article,
    index,
    totalCount,
    onArticlePress,
  }: {
    article: Article;
    index: number;
    totalCount: number;
    onArticlePress: (article: Article) => void;
  }) => {
    // Use our custom animation hook with the appropriate delay
    const { animatedStyle, startAnimation } = useFadeInAnimation(300 + index * 100, 400);

    // Start the animation when the component mounts
    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <Animated.View
        style={[index < totalCount - 1 ? styles.featuredItemMargin : undefined, animatedStyle]}
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
    // Use our custom fade-in animation
    const { animatedStyle: sectionFadeIn, startAnimation: startSectionAnimation } =
      useFadeInAnimation(300, 500);

    useEffect(() => {
      startSectionAnimation();
    }, [startSectionAnimation]);

    if (articles.length === 0) return null;

    return (
      <Animated.View style={[styles.featuredSection, sectionFadeIn]}>
        <SectionTitle title="Featured Articles" />
        <View style={styles.paddingHorizontal}>
          {articles.map((article, index) => (
            <FeaturedArticleItem
              key={`featured-${article.id}`}
              article={article}
              index={index}
              totalCount={articles.length}
              onArticlePress={onArticlePress}
            />
          ))}
        </View>
      </Animated.View>
    );
  }
);
FeaturedArticles.displayName = 'FeaturedArticles';

// Continue Reading Section Component
const ContinueReadingSection = React.memo(() => {
  const colors = useColors();
  const inProgressArticles = useAppSelectorMemo(state => state.readingList.inProgressArticles);
  const { animatedStyle, startAnimation } = useFadeInAnimation(100, 500);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  if (!inProgressArticles || inProgressArticles.length === 0) {
    return (
      <Animated.View style={[styles.categorySection, animatedStyle]}>
        <SectionTitle title="Continue Reading" />
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            No articles in progress. Start reading to see them here!
          </ThemedText>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.categorySection, animatedStyle]}>
      <SectionTitle title="Continue Reading" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={inProgressArticles}
        keyExtractor={item => `continue-${item.id}`}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <CompactArticleCard
            article={item}
            onPress={() => router.push(`/article/${item.id}`)}
            showTimeAgo={true}
          />
        )}
      />
    </Animated.View>
  );
});
ContinueReadingSection.displayName = 'ContinueReadingSection';

// Create an AnimatedPill component for reuse with authors and categories
const AnimatedPill = React.memo(
  ({
    item,
    onPress,
    isSelected,
    styleGetter,
    textStyleGetter,
    delay = 0,
    label,
  }: {
    item: any;
    onPress: () => void;
    isSelected: boolean;
    styleGetter: (isSelected: boolean, pressed: boolean) => any;
    textStyleGetter: (isSelected: boolean) => any;
    delay?: number;
    label: string;
  }) => {
    const { animatedStyle, startAnimation } = useFadeInAnimation(
      delay,
      LAYOUT.ANIMATION.DURATION.FAST
    );

    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <Animated.View style={animatedStyle}>
        <Pressable style={({ pressed }) => styleGetter(isSelected, pressed)} onPress={onPress}>
          <ThemedText
            style={textStyleGetter(isSelected)}
            numberOfLines={1}
            ellipsizeMode="tail"
            skipDefaultColor={isSelected}
          >
            {label}
          </ThemedText>
        </Pressable>
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

    // Then update the renderAuthorItem function to use this component
    const renderAuthorItem = useCallback(
      ({ item }: { item: Tables<'authors'> }) => {
        const isSelected = selectedAuthorId === item.id;
        return (
          <AnimatedPill
            key={`author-pill-${item.id}`}
            item={item}
            onPress={() => onSelectAuthor(item.id)}
            isSelected={isSelected}
            styleGetter={getAuthorPillStyle}
            textStyleGetter={getAuthorPillTextStyle}
            delay={650}
            label={item.name}
          />
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

    // And update the renderCategoryItem function similarly
    const renderCategoryItem = useCallback(
      ({ item }: { item: Tables<'categories'> }) => {
        const isSelected = selectedCategoryId === item.id;
        return (
          <AnimatedPill
            key={`category-pill-${item.id}`}
            item={item}
            onPress={() => onSelectCategory(item.id)}
            isSelected={isSelected}
            styleGetter={getCategoryPillStyle}
            textStyleGetter={getCategoryPillTextStyle}
            delay={750}
            label={item.name}
          />
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

// Fix the FeaturedArticle component to use EnhancedImage correctly
const FeaturedArticle = React.memo(() => {
  const colors = useColors();
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { animatedStyle, startAnimation } = useFadeInAnimation(
    200,
    LAYOUT.ANIMATION.DURATION.NORMAL
  );

  // Fetch the featured article
  useEffect(() => {
    setIsLoading(true);
    articlesService
      .getArticles()
      .then(articles => {
        if (articles && articles.length > 0) {
          setFeaturedArticle(articles[0]);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching featured article:', error);
        setIsLoading(false);
      });

    startAnimation();
  }, [startAnimation]);

  return (
    <Animated.View style={animatedStyle}>
      {isLoading ? (
        <View style={[styles.featuredArticleCard, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : featuredArticle ? (
        <Pressable
          style={styles.featuredArticleCard}
          onPress={() => router.push(`/article/${featuredArticle.id}`)}
        >
          <View style={styles.featuredArticleImageContainer}>
            {/* The source needs to be a string, not an object with uri */}
            <EnhancedImage
              source={featuredArticle.cover_image || ''}
              style={styles.featuredArticleImage}
              contentFit="cover"
            />
          </View>
          <View style={styles.featuredArticleContentContainer}>
            <ThemedText style={styles.featuredArticleCategory}>
              {capitalizeFirstLetter(featuredArticle.category?.name ?? '')}
            </ThemedText>
            <ThemedText style={styles.featuredArticleTitle} numberOfLines={2} ellipsizeMode="tail">
              {featuredArticle.title}
            </ThemedText>
            <ThemedText
              style={styles.featuredArticleDescription}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {featuredArticle.description || ''}
            </ThemedText>
          </View>
        </Pressable>
      ) : (
        <View style={styles.featuredArticleCard}>
          <ThemedText>No articles available</ThemedText>
        </View>
      )}
    </Animated.View>
  );
});

export default function ArticlesScreen() {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const { session } = useSafeAuth();

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

        <ContinueReadingSection />

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
