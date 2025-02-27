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

        const fetchedArticles = await articlesService.getArticles(
          selectedCategory ? selectedCategory.id : undefined
        );
        setArticles(fetchedArticles);
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
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
            backgroundColor: 'transparent', // Changed to transparent for blur effect
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
          tabBarBackground: () => (
            <BlurView
              intensity={80}
              tint={isDarkTheme ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ),
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
      isDarkTheme,
      tabBarVisibleAnim,
      animateTabBar,
      animateCategories,
    ]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const currentTimestamp = Date.now();
      const scrollingDown = currentScrollY > lastScrollY.current;

      // Check for pull-to-refresh gesture
      if (currentScrollY < -50 && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        tintColor={colors.tint}
        colors={[colors.tint]}
        progressBackgroundColor={colors.background}
      />
    ),
    [isRefreshing, handleRefresh, colors.tint, colors.background]
  );

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <View style={{ flex: 1 }}>
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 0 }}
      >
        <FlatList
          ref={flatListRef}
          data={articles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={[
            styles.flatListContent,
            {
              paddingTop: categoryPillsHeight - 60, // Reduce padding to close the gap
            },
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          // Add decelerationRate for smoother scrolling
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
          // Add momentum scrolling for iOS
          snapToAlignment="start"
        />
      </ThemedView>

      {/* Category Pills with Blur Effect */}
      <Animated.View
        style={[
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
            backgroundColor: 'transparent', // Make transparent to show blur
            height: categoryPillsHeight,
          },
        ]}
      >
        <BlurView
          intensity={isDarkTheme ? 40 : 80}
          tint={isDarkTheme ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)' },
          ]}
        />

        {/* Safe area spacer */}
        <View style={{ height: insets.top }} />

        {/* Category pills */}
        <View style={styles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {/* "All" category */}
            <TouchableOpacity
              style={[
                styles.categoryPill,
                {
                  backgroundColor:
                    selectedCategory === null
                      ? isDarkTheme
                        ? `${colors.tint}20`
                        : `${colors.tint}70`
                      : isDarkTheme
                        ? `${colors.elevation2}40`
                        : `${colors.elevation1}90`,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleCategorySelect(null);
              }}
            >
              <ThemedText
                style={[
                  styles.categoryPillText,
                  {
                    color:
                      selectedCategory === null
                        ? isDarkTheme
                          ? colors.white
                          : colors.white
                        : isDarkTheme
                          ? `${colors.text}90`
                          : `${colors.text}80`,
                    fontWeight: selectedCategory === null ? '700' : '600',
                  },
                ]}
                skipDefaultColor
              >
                ALL
              </ThemedText>
            </TouchableOpacity>

            {/* Category pills */}
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor:
                      selectedCategory?.id === category.id
                        ? isDarkTheme
                          ? `${colors.tint}20`
                          : `${colors.tint}70`
                        : isDarkTheme
                          ? `${colors.elevation2}40`
                          : `${colors.elevation1}90`,
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
                      color:
                        selectedCategory?.id === category.id
                          ? isDarkTheme
                            ? colors.white
                            : colors.white
                          : isDarkTheme
                            ? `${colors.text}90`
                            : `${colors.text}80`,
                      fontWeight: selectedCategory?.id === category.id ? '700' : '600',
                    },
                  ]}
                  skipDefaultColor
                >
                  {category.name.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Right fade gradient */}
          <LinearGradient
            colors={['transparent', colors.background, colors.background]}
            start={{ x: 0.3, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            locations={[0, 0.7, 1]}
            style={styles.rightFadeGradient}
            pointerEvents="none"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.2)', // Subtle border for separation
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
