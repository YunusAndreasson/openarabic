import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useCallback, memo } from 'react';
import { StyleSheet, RefreshControl, View } from 'react-native';

import { useIsDarkMode } from '@/hooks/useThemeDetection';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';
import { formatTimeAgo } from '../../utils/dateUtils';
import { capitalizeFirstLetter } from '../../utils/stringUtils';
import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

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
}

// Move components outside of the parent component
interface ArticleItemProps {
  article: Article;
  onPress?: (article: Article) => void;
  isDarkMode: boolean;
}

const ArticleItem = memo(({ article, onPress, isDarkMode }: ArticleItemProps) => {
  const categoryName = article.category?.name
    ? capitalizeFirstLetter(article.category.name)
    : 'Uncategorized';

  const timeAgoText = formatTimeAgo(article.created_at);

  return (
    <View style={styles.articleContainer}>
      <BaseCard onPress={() => onPress?.(article)} style={styles.card} shadowSize="small">
        <View style={styles.cardContent}>
          <View style={styles.textContent}>
            <ThemedText type="bodyBold" numberOfLines={2} colorName="text" style={styles.titleText}>
              {article.title}
            </ThemedText>
            <ThemedText type="caption" colorName="textTertiary" numberOfLines={1}>
              {categoryName} · {timeAgoText} · by {article.author?.name || 'Anonymous'}
            </ThemedText>
          </View>
          <View style={styles.iconContainer}>
            <ThemedText
              type="heading3"
              colorName="textTertiary"
              variant={isDarkMode ? 'primary' : 'secondary'}
              style={styles.arrowText}
            >
              →
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </View>
  );
});
ArticleItem.displayName = 'ArticleItem';

interface RenderItemProps {
  item: Article;
  onPress?: (article: Article) => void;
  isDarkMode: boolean;
}

const RenderItem = ({ item, onPress, isDarkMode }: RenderItemProps) => (
  <ArticleItem article={item} onPress={onPress} isDarkMode={isDarkMode} />
);
RenderItem.displayName = 'RenderItem';

interface EmptyViewProps {
  isLoading?: boolean;
}

const EmptyView = ({ isLoading }: EmptyViewProps) => {
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

/**
 * A specialized component for displaying filtered articles
 * Uses a simple ScrollView instead of FlashList to avoid recycling issues
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  isLoading,
  isRefreshing,
  onRefresh,
  onArticlePress,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const navHeaderHeight = useHeaderHeight();

  // Determine the header title based on selected filters

  // Calculate header height for spacer
  const headerHeight = useMemo(() => navHeaderHeight + LAYOUT.SPACING.SMALL, [navHeaderHeight]);

  const renderItemCallback = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: Article }) => (
      <RenderItem item={item} onPress={onArticlePress} isDarkMode={isDarkMode} />
    ),
    [onArticlePress, isDarkMode]
  );

  const ListFooterComponent = useMemo(() => {
    return null;
  }, [articles.length]);

  // Create a header spacer component
  const HeaderSpacer = useMemo(() => {
    return <View style={[styles.headerSpacer, { height: headerHeight }]} />;
  }, [headerHeight]);

  // Calculate the estimated item height based on content + padding + margins
  const ITEM_HEIGHT = 100; // Adjust this based on your actual card height

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <FlashList
        data={articles}
        renderItem={renderItemCallback}
        estimatedItemSize={ITEM_HEIGHT}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={HeaderSpacer}
        ListEmptyComponent={<EmptyView isLoading={isLoading} />}
        ListFooterComponent={ListFooterComponent}
        showsVerticalScrollIndicator={true}
        drawDistance={ITEM_HEIGHT * 5}
        overrideItemLayout={layout => {
          layout.size = ITEM_HEIGHT;
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.tint]}
            tintColor={colors.tint}
          />
        }
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  arrowText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    flex: 1,
  },
  endMessageContainer: {
    height: LAYOUT.SPACING.XLARGE,
  },
  headerSpacer: {
    height: 0, // This will be dynamically set
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: LAYOUT.SPACING.XLARGE,
  },
  listContent: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  noResultsContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE,
  },
  noResultsText: {
    textAlign: 'center',
  },
  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
