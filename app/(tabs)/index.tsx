import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Animated,
  RefreshControl,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { router, useNavigation } from 'expo-router';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '../../services/articles';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { categoriesService } from '@/services/categories';
import type { Tables } from '@/types/database.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '@/constants/layout';
import { Loader } from '@/components/Loader';
import { useAppSelectorMemo } from '@/store/hooks';
import { Theme } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';

// Constants
const ITEM_HEIGHT = 360;
const SCROLL_THRESHOLD = 10;
const INITIAL_SCROLL_THRESHOLD = 20;
const VELOCITY_THRESHOLD = 0.5;

// Should be moved to a separate file
const CategoryPill = ({
  category,
  isSelected,
  onSelect,
  colors,
  isDarkMode,
}: {
  category: Tables<'categories'> | null;
  isSelected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
  isDarkMode: boolean;
}) => {
  const backgroundColor = isSelected
    ? isDarkMode
      ? `${colors.tint}20`
      : `${colors.tint}70`
    : isDarkMode
      ? `${colors.elevation2}40`
      : `${colors.elevation1}90`;

  const textColor = isSelected
    ? colors.white
    : isDarkMode
      ? `${colors.text}90`
      : `${colors.text}80`;

  const categoryName = category?.name?.toUpperCase() || 'ALL';
  const fontWeight = isSelected ? '700' : '600';

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
        onSelect();
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
};

// Should be moved to a separate file
const AnimatedHeader = ({
  categoryVisibleAnim,
  colors,
  categoryPillsHeight,
  insets,
  isDarkTheme,
  categories,
  renderCategoryPill,
}: {
  categoryVisibleAnim: Animated.Value;
  colors: ReturnType<typeof useColors>;
  categoryPillsHeight: number;
  insets: { top: number; bottom: number; left: number; right: number };
  isDarkTheme: boolean;
  categories: Tables<'categories'>[];
  renderCategoryPill: (category: Tables<'categories'> | null) => React.ReactNode;
}) => {
  const headerContainerStyle = [
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
      backgroundColor: colors.background + '80',
      height: categoryPillsHeight + LAYOUT.SPACING.MEDIUM,
      paddingTop: Platform.select({
        ios: insets.top,
        android: insets.top + LAYOUT.SPACING.MEDIUM,
      }),
    },
  ];

  return (
    <Animated.View
      style={headerContainerStyle}
      needsOffscreenAlphaCompositing={Platform.OS === 'android'}
    >
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          removeClippedSubviews={true}
          scrollEventThrottle={16}
          directionalLockEnabled={true}
          bounces={false}
          overScrollMode="never"
        >
          {renderCategoryPill(null)}
          {categories.map(category => renderCategoryPill(category))}
        </ScrollView>

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
  );
};

export default function ArticlesScreen() {
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

  // Calculate values
  const baseHeight = 30; // Fixed height for the category container
  const topInset = insets.top || 0;

  const categoryPillsHeight =
    Platform.select({
      ios: topInset + baseHeight,
      android: topInset + LAYOUT.SPACING.XLARGE,
    }) ?? topInset + baseHeight;

  const fetchArticles = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setIsRefreshing(true);
        } else if (!isRefreshing) {
          setIsLoading(true);
        }
        setError(null);

        const fetchedArticles = await Promise.all([
          articlesService.getArticles(selectedCategory ? selectedCategory.id : undefined),
          // Minimum delay of 500ms to ensure refresh indicator is visible
          new Promise(resolve => setTimeout(resolve, 500)),
        ]).then(([articles]) => articles);

        setArticles(fetchedArticles);
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
      } finally {
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
      console.warn('Failed to fetch categories');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    isRefreshingRef.current = true;
    fetchArticles(true);
    fetchCategories();
  }, [fetchArticles, fetchCategories]);

  const handleCategorySelect = useCallback((category: Tables<'categories'> | null) => {
    setSelectedCategory(category);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Simplified animation functions
  const animateVisibility = useCallback(
    (visible: boolean) => {
      // Animate both categories and tab bar together
      const animations = [
        Animated.spring(categoryVisibleAnim, {
          toValue: visible ? 1 : 0,
          useNativeDriver: true,
          friction: 8,
          tension: 50,
        }),
        Animated.spring(tabBarVisibleAnim, {
          toValue: visible ? 1 : 0,
          useNativeDriver: true,
          friction: 8,
          tension: 50,
        }),
      ];

      Animated.parallel(animations).start();
    },
    [categoryVisibleAnim, tabBarVisibleAnim]
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
            backgroundColor: colors.background,
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
          tabBarBackground: undefined,
        });

        // Animate both tab bar and categories
        animateVisibility(visible);
      }
    },
    [isTabBarVisible, navigation, colors, tabBarVisibleAnim, animateVisibility]
  );

  // Simplified scroll handler
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { y: currentScrollY } = event.nativeEvent.contentOffset;
      const currentTimestamp = Date.now();
      const scrollingDown = currentScrollY > lastScrollY.current;

      // Check for pull-to-refresh gesture
      if (currentScrollY < -50 && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!isRefreshing) {
          handleRefresh();
        }
      } else if (currentScrollY >= 0) {
        isRefreshingRef.current = false;
      }

      // Calculate velocity
      if (lastScrollTimestamp.current) {
        const timeDelta = currentTimestamp - lastScrollTimestamp.current;
        if (timeDelta > 0) {
          scrollVelocity.current = Math.abs(currentScrollY - lastScrollY.current) / timeDelta;
        }
      }
      lastScrollTimestamp.current = currentTimestamp;

      // Always show headers at top of list
      if (currentScrollY < 10) {
        if (!isTabBarVisible) {
          toggleTabBarVisibility(true);
        }
        lastScrollY.current = currentScrollY;
        return;
      }

      // Check if scroll is significant enough to trigger UI changes
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);
      const isSignificantMovement =
        scrollVelocity.current > VELOCITY_THRESHOLD || scrollDelta > SCROLL_THRESHOLD;

      // Update UI based on scroll direction and significance
      if (
        scrollingDown &&
        isTabBarVisible &&
        isSignificantMovement &&
        currentScrollY > INITIAL_SCROLL_THRESHOLD
      ) {
        toggleTabBarVisibility(false);
      } else if (
        !scrollingDown &&
        !isTabBarVisible &&
        (isSignificantMovement || currentScrollY < INITIAL_SCROLL_THRESHOLD)
      ) {
        toggleTabBarVisibility(true);
      }

      lastScrollY.current = currentScrollY;
    },
    [isTabBarVisible, toggleTabBarVisibility, isRefreshing, handleRefresh]
  );

  const renderItem: ListRenderItem<Article> = ({ item }) => (
    <ThemedCard
      imageUrl={'https://picsum.photos/800/400'}
      title={item.title}
      category={item.category?.name ?? 'Uncategorized'}
      author={item.author?.name ?? 'Anonymous'}
      onPress={() => router.push(`/article/${item.id}`)}
    />
  );

  const keyExtractor = (item: Article) => item.id.toString();

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const ListEmptyComponent = () => {
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
  };

  const renderCategoryPill = (category: Tables<'categories'> | null) => {
    const isSelected =
      category === null ? selectedCategory === null : selectedCategory?.id === category.id;

    return (
      <CategoryPill
        key={category?.id || 'all'}
        category={category}
        isSelected={isSelected}
        onSelect={() => handleCategorySelect(category)}
        colors={colors}
        isDarkMode={isDarkTheme}
      />
    );
  };

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Sync isRefreshingRef with isRefreshing state
  useEffect(() => {
    if (!isRefreshing) {
      isRefreshingRef.current = false;
    }
  }, [isRefreshing]);

  return (
    <View style={styles.container}>
      <ThemedView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 0 }}
        useSafeArea={false}
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
              paddingTop: categoryPillsHeight,
              paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT,
            },
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
              progressBackgroundColor={colors.background}
              progressViewOffset={categoryPillsHeight}
              title={isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
              titleColor={colors.text}
            />
          }
          removeClippedSubviews={true}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
          snapToAlignment="start"
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          onEndReachedThreshold={0.5}
        />
      </ThemedView>

      {/* Category Pills */}
      <AnimatedHeader
        categoryVisibleAnim={categoryVisibleAnim}
        colors={colors}
        categoryPillsHeight={categoryPillsHeight}
        insets={insets}
        isDarkTheme={isDarkTheme}
        categories={categories}
        renderCategoryPill={renderCategoryPill}
      />
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
    marginTop: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  categoryContainer: {
    height: 30,
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
