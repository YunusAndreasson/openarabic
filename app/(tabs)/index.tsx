import { StyleSheet, FlatList, ListRenderItem, Platform, View, RefreshControl } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '@/constants/layout';
import { Loader, LoadingScreen } from '@/components/Loader';
import { useAppSelectorMemo } from '@/store/hooks';
import { Theme } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Constants
const ITEM_HEIGHT = 360;

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

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
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
      } finally {
        // Ensure loader shows for at least 500ms for a more consistent experience
        const timeElapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
        const remainingTime = Math.max(0, 500 - timeElapsed);

        if (remainingTime > 0 && !showRefreshing) {
          loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
            loadingStartTime.current = null;
          }, remainingTime);
        } else {
          setIsLoading(false);
          setIsRefreshing(false);
          loadingStartTime.current = null;
        }
      }
    },
    [isRefreshing]
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchArticles(true);
  }, [fetchArticles]);

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
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>{error}</ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No articles available</ThemedText>
      </View>
    );
  }, [error]);

  const ItemSeparatorComponent = useCallback(
    () => <View style={{ height: LAYOUT.LIST_VERTICAL_SPACING }} />,
    []
  );

  // Use focus effect to refresh data when tab becomes active
  useFocusEffect(
    useCallback(() => {
      fetchArticles();
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }, [fetchArticles])
  );

  // Toggle forceUpdate to trigger a re-render if needed (e.g., for theme changes)
  useEffect(() => {
    if (!isInitialMount.current) {
      setForceUpdate(prev => !prev);
    } else {
      isInitialMount.current = false;
    }
  }, [isDarkTheme]);

  // Render
  if (isLoading && !isRefreshing) {
    return (
      <ThemedView style={styles.container}>
        <LoadingScreen />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
      {/* Standard header like vocabulary and playlist screens */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Texts</ThemedText>
      </View>

      <FlatList
        ref={flatListRef}
        data={articles}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={ItemSeparatorComponent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.tint]}
            tintColor={colors.tint}
            progressBackgroundColor={colors.cardBackground}
          />
        }
        contentContainerStyle={styles.flatListContent}
      />
    </ThemedView>
  );
}

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <ThemedText style={styles.emptyText}>No articles available right now</ThemedText>
  </View>
);

const ErrorState = ({ message }: { message: string }) => (
  <View style={styles.emptyContainer}>
    <ThemedText style={styles.emptyText}>{message}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    width: '100%',
  },
  emptyText: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  flatListContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
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
});
