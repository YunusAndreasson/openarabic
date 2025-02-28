import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Animated,
  RefreshControl,
  ViewStyle,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
import { router, useNavigation } from 'expo-router';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '../../services/articles';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { CategoryPills } from '@/components/CategoryPills';
import { categoriesService } from '@/services/categories';
import type { Tables } from '@/types/database.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '@/constants/layout';
import { Loader, LoadingScreen } from '@/components/Loader';
import { useAppSelectorMemo } from '@/store/hooks';
import { Theme } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Constants
const ITEM_HEIGHT = 360;
const SCROLL_THRESHOLD = 10;
const ANIMATION_DURATION = 250;
const INITIAL_SCROLL_THRESHOLD = 20;
const VELOCITY_THRESHOLD = 0.5;

// Memoize the card component for better performance
const MemoizedCard = memo(ThemedCard);

export default function TextsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currentTheme = useAppSelectorMemo(state => state.theme.theme);
  const isDarkTheme = currentTheme === Theme.Dark;
  const isRefreshingRef = useRef(false);

  // Refs
  const lastScrollY = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  const categoryVisibleAnim = useRef(new Animated.Value(1)).current;
  const tabBarVisibleAnim = useRef(new Animated.Value(1)).current;
  const lastScrollTimestamp = useRef(0);
  const scrollVelocity = useRef(0);

  // State
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized values
  const categoryPillsHeight = useMemo(() => {
    // Calculate height for the category pills area
    return insets.top + 30; // 30px for the actual pills
  }, [insets.top]);

  // Callbacks
  const fetchArticles = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setIsRefreshing(true);
        } else if (!isRefreshing) {
          setIsLoading(true);
        }
        setError(null);

        // Add a small delay to ensure the refresh indicator is visible
        // This helps on devices where the network is too fast
        const fetchedArticles = await Promise.all([
          articlesService.getArticles(selectedCategory ? selectedCategory.id : undefined),
          // Minimum delay of 500ms to ensure refresh indicator is visible
          new Promise(resolve => setTimeout(resolve, 500)),
        ]).then(([articles]) => articles);

        setArticles(fetchedArticles);
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
      } finally {
        // Small delay before hiding the refresh indicator
        setTimeout(() => {
          setIsLoading(false);
          setIsRefreshing(false);
          isRefreshingRef.current = false;
        }, 300);
      }
    },
    [selectedCategory, isRefreshing]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await categoriesService.getCategories();
      setCategories(fetchedCategories);
    } catch {
      // We don't set error here to avoid blocking article display
      console.warn('Failed to fetch categories');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Trigger haptic feedback when refreshing
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Set isRefreshingRef to true to ensure proper state tracking
    isRefreshingRef.current = true;
    // Call fetchArticles with true to show the refreshing indicator
    fetchArticles(true);
    fetchCategories();
  }, [fetchArticles, fetchCategories]);

  const handleCategorySelect = useCallback((category: Tables<'categories'> | null) => {
    setSelectedCategory(category);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const animateCategories = useCallback(
    (visible: boolean) => {
      // Animate categories just like the tab bar
      Animated.spring(categoryVisibleAnim, {
        toValue: visible ? 1 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }).start();
    },
    [categoryVisibleAnim]
  );

  const animateTabBar = useCallback(
    (visible: boolean) => {
      Animated.spring(tabBarVisibleAnim, {
        toValue: visible ? 1 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }).start();
    },
    [tabBarVisibleAnim]
  );

  const toggleTabBarVisibility = useCallback(
    (visible: boolean) => {
      if (visible !== isTabBarVisible) {
        setIsTabBarVisible(visible);

        // Update tab bar visibility with proper styling
        navigation.setOptions({
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background, // Changed from transparent to solid background
            borderTopWidth: 0,
            height: LAYOUT.BOTTOM_BAR.HEIGHT,
            zIndex: LAYOUT.Z_INDEX.HEADER,
            transform: [
              {
                translateY: tabBarVisibleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [LAYOUT.BOTTOM_BAR.HEIGHT, 0],
                }),
              },
            ],
            opacity: tabBarVisibleAnim,
            ...Platform.select({
              ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
                shadowRadius: LAYOUT.SPACING.SMALL / 2,
                paddingBottom: LAYOUT.SPACING.SMALL,
              },
              android: {
                elevation: 8,
              },
            }),
          },
          tabBarIconStyle: Platform.OS === 'ios' ? { marginTop: LAYOUT.SPACING.TINY } : undefined,
          tabBarLabelStyle:
            Platform.OS === 'ios'
              ? {
                  fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                  marginBottom: LAYOUT.SPACING.TINY,
                  fontWeight: '500',
                }
              : undefined,
          // Remove the blur background
          tabBarBackground: undefined,
        });

        // Animate both tab bar and categories
        animateTabBar(visible);
        animateCategories(visible);
      }
    },
    [
      isTabBarVisible,
      navigation,
      colors.shadow,
      colors.background,
      isDarkTheme,
      tabBarVisibleAnim,
      animateTabBar,
      animateCategories,
    ]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { y: currentScrollY } = event.nativeEvent.contentOffset;
      const currentTimestamp = Date.now();
      const scrollingDown = currentScrollY > lastScrollY.current;

      // Check for pull-to-refresh gesture
      if (currentScrollY < -50 && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Manually trigger refresh when pull gesture is detected
        if (!isRefreshing) {
          handleRefresh();
        }
      } else if (currentScrollY >= 0) {
        isRefreshingRef.current = false;
      }

      // Calculate velocity (pixels per millisecond)
      if (lastScrollTimestamp.current) {
        const timeDelta = currentTimestamp - lastScrollTimestamp.current;
        if (timeDelta > 0) {
          scrollVelocity.current = Math.abs(currentScrollY - lastScrollY.current) / timeDelta;
        }
      }

      lastScrollTimestamp.current = currentTimestamp;

      // Detect tiny scrolls and ignore them
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);
      if (scrollDelta < 2) {
        lastScrollY.current = currentScrollY;
        return;
      }

      // Always show category pills when at the top of the list
      if (currentScrollY < 10) {
        if (!isTabBarVisible) {
          toggleTabBarVisibility(true);
        }
        lastScrollY.current = currentScrollY;
        return;
      }

      // Velocity-based detection for more responsive UI
      const isSignificantMovement =
        scrollVelocity.current > VELOCITY_THRESHOLD || scrollDelta > SCROLL_THRESHOLD;

      if (scrollingDown && isTabBarVisible && currentScrollY > INITIAL_SCROLL_THRESHOLD) {
        if (isSignificantMovement) {
          toggleTabBarVisibility(false);
        }
      } else if (!scrollingDown && !isTabBarVisible) {
        if (isSignificantMovement || currentScrollY < INITIAL_SCROLL_THRESHOLD) {
          toggleTabBarVisibility(true);
        }
      }

      lastScrollY.current = currentScrollY;
    },
    [isTabBarVisible, toggleTabBarVisibility]
  );

  // Memoize the renderItem function to prevent unnecessary re-renders
  const renderItem = useCallback<ListRenderItem<Article>>(
    ({ item }) => (
      <MemoizedCard
        imageUrl={'https://picsum.photos/800/400'}
        title={item.title}
        category={item.category?.name ?? 'Uncategorized'}
        author={item.author?.name ?? 'Anonymous'}
        onPress={() => router.push(`/article/${item.id}`)}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Memoize the empty component to prevent unnecessary re-renders
  const ListEmptyComponent = useCallback(() => {
    if (isLoading && !isRefreshing) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <Loader size="large" color={colors.tint} />
        </ThemedView>
      );
    }

    if (error) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No articles found</ThemedText>
      </ThemedView>
    );
  }, [isLoading, isRefreshing, error, colors.tint]);

  // Memoize the refresh control to prevent unnecessary re-renders
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        tintColor={colors.tint}
        colors={[colors.tint]}
        progressBackgroundColor={colors.background}
        progressViewOffset={categoryPillsHeight} // Adjust for the category pills
        title={isRefreshing ? 'Refreshing...' : 'Pull to refresh'} // iOS only
        titleColor={colors.text}
      />
    ),
    [isRefreshing, handleRefresh, colors.tint, colors.background, colors.text, categoryPillsHeight]
  );

  // Memoize category pill rendering for better performance
  const renderCategoryPill = useCallback(
    (category: Tables<'categories'> | null) => {
      const isSelected =
        category === null ? selectedCategory === null : selectedCategory?.id === category.id;

      const backgroundColor = isSelected
        ? isDarkTheme
          ? `${colors.tint}20`
          : `${colors.tint}70`
        : isDarkTheme
          ? `${colors.elevation2}40`
          : `${colors.elevation1}90`;

      const textColor = isSelected
        ? isDarkTheme
          ? colors.white
          : colors.white
        : isDarkTheme
          ? `${colors.text}90`
          : `${colors.text}80`;

      const fontWeight = isSelected ? '700' : '600';
      const categoryName = category?.name?.toUpperCase() || 'ALL';

      return (
        <TouchableOpacity
          key={category?.id || 'all'}
          style={[
            styles.categoryPill,
            {
              backgroundColor,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleCategorySelect(category);
          }}
        >
          <ThemedText
            style={[
              styles.categoryPillText,
              {
                color: textColor,
                fontWeight,
              },
            ]}
            skipDefaultColor
          >
            {categoryName}
          </ThemedText>
        </TouchableOpacity>
      );
    },
    [selectedCategory, isDarkTheme, colors, handleCategorySelect]
  );

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Sync isRefreshingRef with isRefreshing state
  useEffect(() => {
    // When isRefreshing becomes false, ensure isRefreshingRef is also false
    if (!isRefreshing) {
      isRefreshingRef.current = false;
    }
  }, [isRefreshing]);

  // Memoize the FlatList content container style
  const flatListContentContainerStyle = useMemo(
    () => [
      styles.flatListContent,
      {
        paddingTop: categoryPillsHeight,
        paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT,
      },
    ],
    [categoryPillsHeight, insets.bottom]
  );

  // Memoize the header container style for better performance
  const headerContainerStyle = useMemo(
    () => [
      styles.headerContainer,
      {
        transform: [
          {
            translateY: categoryVisibleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            }),
          },
        ],
        opacity: categoryVisibleAnim,
        backgroundColor: 'transparent',
        height: categoryPillsHeight,
        paddingTop: insets.top,
      },
    ],
    [categoryVisibleAnim, categoryPillsHeight, insets.top]
  );

  return (
    <View style={{ flex: 1 }}>
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 0 }}
        useSafeArea={false}
      >
        <FlatList
          ref={flatListRef}
          data={articles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={flatListContentContainerStyle}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
          snapToAlignment="start"
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          alwaysBounceVertical={true}
          // Additional performance optimizations
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          // Optimize memory usage
          onEndReachedThreshold={0.5}
        />
      </ThemedView>

      {/* Category Pills */}
      <Animated.View
        style={headerContainerStyle}
        // Add hardware acceleration for smoother animations
        needsOffscreenAlphaCompositing={true}
      >
        {/* Transparent background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />

        {/* Category pills */}
        <View style={styles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
            // Optimize scrolling performance
            removeClippedSubviews={true}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            directionalLockEnabled={true}
            bounces={false}
          >
            {/* "All" category */}
            {renderCategoryPill(null)}

            {/* Category pills */}
            {categories.map(category => renderCategoryPill(category))}
          </ScrollView>

          {/* Right fade gradient - only show for dark mode on iOS or any theme on Android */}
          {(Platform.OS === 'android' || (Platform.OS === 'ios' && isDarkTheme)) && (
            <LinearGradient
              colors={['transparent', colors.background, colors.background]}
              start={{ x: 0.3, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              locations={[0, 0.7, 1]}
              style={styles.rightFadeGradient}
              pointerEvents="none"
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  errorText: {
    textAlign: 'center',
    marginHorizontal: LAYOUT.SPACING.LARGE,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    width: '100%',
  },
  emptyText: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: 0.7,
  },
  flatListContent: {
    paddingBottom: LAYOUT.LIST_VERTICAL_SPACING,
    // No horizontal padding to allow content to fill the screen width
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    marginTop: 0,
    // Hardware acceleration is applied in the Animated.View props
  },
  categoryContainer: {
    height: 30, // Fixed height for the category container
  },
  categoryScrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: 0,
    gap: LAYOUT.SPACING.SMALL,
  },
  categoryPill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY + 1,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: 0.5,
  },
  categoryPillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  rightFadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    zIndex: 1,
  },
});
