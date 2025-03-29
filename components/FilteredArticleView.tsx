import React, { useMemo } from 'react';
import { StyleSheet, RefreshControl, View, FlatList } from 'react-native';
import { Article } from '../types/articles.types';
import BaseCard from './BaseCard';
import { LAYOUT, getHeaderHeight } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { CopyrightFooter } from './CopyrightFooter';
import { Tables } from '../types/database.types';
import { capitalizeFirstLetter } from '../utils/stringUtils';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import PageHeader from './PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FilteredArticleViewProps {
  /**
   * Articles to display in the filtered view
   */
  articles: Article[];

  /**
   * Whether the view is in a loading state
   */
  isLoading?: boolean;

  /**
   * Whether the view is in a refreshing state
   */
  isRefreshing: boolean;

  /**
   * Callback when the view is refreshed
   */
  onRefresh: () => void;

  /**
   * Callback when an article is pressed
   */
  onArticlePress?: (article: Article) => void;

  /**
   * Selected author (if filtering by author)
   */
  selectedAuthor?: Tables<'authors'> | null;

  /**
   * Selected category (if filtering by category)
   */
  selectedCategory?: Tables<'categories'> | null;

  /**
   * Callback to clear the current filter
   */
  onClearFilter?: () => void;
}

/**
 * A specialized component for displaying filtered articles
 * Uses a simple ScrollView instead of FlatList to avoid recycling issues
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  isLoading,
  isRefreshing,
  onRefresh,
  onArticlePress,
  selectedAuthor,
  selectedCategory,
  onClearFilter,
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Determine the header title based on selected filters
  const headerTitle = useMemo(() => {
    if (selectedAuthor) {
      return selectedAuthor.name;
    } else if (selectedCategory) {
      return capitalizeFirstLetter(selectedCategory.name.toLowerCase());
    } else if (isLoading) {
      // Show a loading message while data is being fetched
      return 'Loading...';
    } else {
      // Fallback
      return 'Articles';
    }
  }, [selectedAuthor, selectedCategory, isLoading]);

  // Calculate header height for spacer
  const headerHeight = useMemo(() => getHeaderHeight(insets), [insets]);

  const ArticleItem = React.memo(({ article }: { article: Article }) => (
    <View style={styles.articleContainer}>
      <BaseCard onPress={() => onArticlePress?.(article)} style={styles.card} shadowSize="small">
        <View style={styles.cardContent}>
          <View style={styles.textContent}>
            <ThemedText type="bodyBold" style={styles.titleText}>
              {article.title}
            </ThemedText>
            <ThemedText type="label" variant="secondary" numberOfLines={1}>
              {article.author?.name || 'Anonymous'}
            </ThemedText>
          </View>
          <View style={styles.iconContainer}>
            <ThemedText type="label" variant="secondary" style={styles.arrowText}>
              →
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </View>
  ));
  ArticleItem.displayName = 'ArticleItem';

  const renderItem = useMemo(() => {
    const RenderItem = ({ item }: { item: Article }) => <ArticleItem article={item} />;
    RenderItem.displayName = 'RenderItem';
    return RenderItem;
  }, [ArticleItem]);

  const ListEmptyComponent = useMemo(() => {
    const EmptyView = () => {
      if (isLoading) return null;
      return (
        <View style={styles.noResultsContainer}>
          <ThemedText
            style={styles.noResultsText}
            accessibilityLabel="No articles found with the current filter"
          >
            No articles found
          </ThemedText>
        </View>
      );
    };
    EmptyView.displayName = 'EmptyView';
    return EmptyView;
  }, [isLoading]);

  const ListFooterComponent = useMemo(() => {
    if (!articles.length) return null;
    return (
      <>
        <View style={styles.endMessageContainer} />
        <CopyrightFooter />
      </>
    );
  }, [articles.length]);

  // Create a header spacer component
  const HeaderSpacer = useMemo(() => {
    return <View style={[styles.headerSpacer, { height: headerHeight + 20 }]} />;
  }, [headerHeight]);

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <FlatList
        data={articles}
        renderItem={renderItem}
        keyExtractor={item => `filtered-article-${item.id}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={HeaderSpacer}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        showsVerticalScrollIndicator={true}
        indicatorStyle={colors.text === '#212121' ? 'black' : 'white'}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.tint]}
            tintColor={colors.tint}
          />
        }
      />
      <PageHeader title={headerTitle} onBackPress={onClearFilter} />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE,
  },
  noResultsText: {
    textAlign: 'center',
  },
  endMessageContainer: {
    height: LAYOUT.SPACING.XLARGE,
  },
  arrowText: {
    opacity: LAYOUT.OPACITY.DISABLED / 1.5,
  },
  headerSpacer: {
    height: 0, // This will be dynamically set
  },
});

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
