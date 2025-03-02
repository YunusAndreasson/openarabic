import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  Platform,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
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
import { useFocusEffect } from '@react-navigation/native';

// Constants
const ITEM_HEIGHT = 360;

// Should be moved to a separate file
const CategoryHeader = ({
  colors,
  categoryPillsHeight,
  insets,
  isDarkTheme,
  categories,
  selectedCategory,
  onCategorySelect,
}: {
  colors: ReturnType<typeof useColors>;
  categoryPillsHeight: number;
  insets: { top: number; bottom: number; left: number; right: number };
  isDarkTheme: boolean;
  categories: Tables<'categories'>[];
  selectedCategory: Tables<'categories'> | null;
  onCategorySelect: (category: Tables<'categories'> | null) => void;
}) => {
  const headerContainerStyle = [
    styles.headerContainer,
    {
      backgroundColor: `${colors.background}${isDarkTheme ? 'CC' : '99'}`,
      height: categoryPillsHeight + LAYOUT.SPACING.MEDIUM,
      paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + LAYOUT.SPACING.MEDIUM,
    },
  ];

  const renderPill = (category: Tables<'categories'> | null) => {
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
      ? colors.white
      : isDarkTheme
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
          onCategorySelect(category);
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

  return (
    <View style={headerContainerStyle}>
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          removeClippedSubviews={true}
          scrollEventThrottle={16}
          overScrollMode="never"
        >
          {renderPill(null)}
          {categories.map(category => renderPill(category))}
        </ScrollView>

        {/* Gradient fade for right edge */}
        {(Platform.OS === 'android' || isDarkTheme) && (
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
    </View>
  );
};

export default function ArticlesScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currentTheme = useAppSelectorMemo(state => state.theme.theme);
  const isDarkTheme = currentTheme === Theme.Dark;

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const isInitialMount = useRef(true);
  const loadingStartTime = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Calculate header height
  const topInset = insets.top || 0;
  const baseHeight = 30;
  const categoryPillsHeight =
    Platform.OS === 'ios' ? topInset + baseHeight : topInset + LAYOUT.SPACING.XLARGE;

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

        const fetchedArticles = await articlesService.getArticles(
          selectedCategory ? selectedCategory.id : undefined
        );

        setArticles(fetchedArticles);
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
      } finally {
        // Ensure loader shows for at least 500ms for a more consistent experience
        const timeElapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
        const minDelay = Math.max(0, 500 - timeElapsed);

        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setIsRefreshing(false);
          isInitialMount.current = false;
          loadingStartTime.current = null;
          // Force a re-render
          setForceUpdate(prev => !prev);
        }, minDelay);
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
    fetchArticles(true);
    fetchCategories();
  }, [fetchArticles, fetchCategories]);

  const handleCategorySelect = useCallback((category: Tables<'categories'> | null) => {
    setSelectedCategory(category);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Effects
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        ...styles.tabBar,
        backgroundColor: colors.background,
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
    });
  }, [navigation, colors]);

  // Memoize renderItem to prevent unnecessary re-renders
  const renderItem = useCallback<ListRenderItem<Article>>(
    ({ item }) => (
      <ThemedCard
        imageUrl={item.image_url || 'https://picsum.photos/800/400'}
        title={item.title}
        category={item.category?.name ?? 'Uncategorized'}
        author={item.author?.name ?? 'Anonymous'}
        onPress={() => router.push(`/article/${item.id}`)}
      />
    ),
    []
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

  // Memoized separator component for better performance
  const ItemSeparatorComponent = useCallback(
    () => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />,
    []
  );

  // Modify app loading initialization
  useEffect(() => {
    const initialLoadingStartTime = Date.now();
    loadingStartTime.current = initialLoadingStartTime;

    Promise.all([fetchCategories(), fetchArticles()]).catch(error => {
      console.error('Error during initial loading:', error);
    });

    // Clean up function to prevent memory leaks
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }
      loadingStartTime.current = null;
    };
  }, [fetchCategories, fetchArticles]);

  // Add focus effect for cleanup when switching tabs
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Clear any pending timeouts when screen loses focus
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = undefined;
        }
        loadingStartTime.current = null;
      };
    }, [])
  );

  // This is where we render the component based on loading state
  if (isLoading && isInitialMount.current) {
    // Use full-screen loader for initial loading
    return (
      <ThemedView style={styles.container}>
        <Loader size="large" color={colors.tint} style={styles.fullScreenLoader} />
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedView style={{ backgroundColor: colors.background }} useSafeArea={false}>
        <CategoryHeader
          colors={colors}
          categoryPillsHeight={categoryPillsHeight}
          insets={insets}
          isDarkTheme={isDarkTheme}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />

        <FlatList
          ref={flatListRef}
          data={articles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={[
            styles.flatListContent,
            {
              paddingTop: categoryPillsHeight + LAYOUT.SPACING.MEDIUM,
              paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT,
            },
          ]}
          ListEmptyComponent={ListEmptyComponent}
          ItemSeparatorComponent={ItemSeparatorComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
              progressBackgroundColor={colors.background}
              progressViewOffset={categoryPillsHeight + LAYOUT.SPACING.MEDIUM}
              title={isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
              titleColor={colors.text}
            />
          }
          removeClippedSubviews={true}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          decelerationRate="normal"
        />
      </ThemedView>
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
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
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
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    height: LAYOUT.BOTTOM_BAR.HEIGHT,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
