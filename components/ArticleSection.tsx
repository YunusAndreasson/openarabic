import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import { ThemedText } from './ThemedText';
import { articlesService } from '@/services/articles';
import ThemedCard from './ThemedCard';
import { LoadingContainer } from './Loader';
import SectionTitle from './SectionTitle';

interface ArticleSectionProps {
  /**
   * Section title
   */
  title: string;

  /**
   * Articles to display
   */
  articles: Article[];

  /**
   * Callback when article is pressed
   */
  onArticlePress: (article: Article) => void;

  /**
   * Show time ago indicator
   */
  showTimeAgo?: boolean;

  /**
   * Use vertical layout instead of horizontal
   */
  vertical?: boolean;

  /**
   * Maximum articles to display
   */
  maxItems?: number;

  /**
   * Empty state message
   */
  emptyStateMessage?: string;

  /**
   * Hide difficulty label text
   */
  hideDifficultyLabel?: boolean;

  /**
   * Hide difficulty indicator
   */
  hideDifficulty?: boolean;

  /**
   * Function to get last opened timestamp
   */
  getLastOpenedAt?: (articleId: number) => string | undefined;

  /**
   * Whether articles are loading
   */
  isLoading?: boolean;
}

/**
 * Displays a section of articles
 */
const ArticleSection = React.memo(
  ({
    title,
    articles,
    onArticlePress,
    showTimeAgo = false,
    vertical = false,
    maxItems,
    emptyStateMessage,
    hideDifficultyLabel = false,
    hideDifficulty = false,
    getLastOpenedAt,
    isLoading = false,
  }: ArticleSectionProps) => {
    const queryClient = useQueryClient();

    // Limit the number of articles if maxItems is specified
    const displayedArticles = maxItems ? articles.slice(0, maxItems) : articles;

    // Handle item press
    const handleItemPress = useCallback(
      (item: Article) => {
        onArticlePress(item);
      },
      [onArticlePress]
    );

    // Handle viewability change for prefetching
    const handleViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: { item: Article }[] }) => {
        for (const { item } of viewableItems) {
          if (item && item.id) {
            queryClient.prefetchQuery({
              queryKey: ['article', item.id],
              queryFn: () => articlesService.getArticleById(item.id),
              staleTime: 0,
              gcTime: 0,
            });
          }
        }
      },
      [queryClient]
    );

    // Render each article item
    const renderItem = useCallback(
      ({ item }: { item: Article }) => (
        <View
          style={vertical ? styles.verticalArticleContainer : styles.horizontalArticleContainer}
        >
          <ThemedCard
            variant="compact"
            article={item}
            onPress={() => handleItemPress(item)}
            showTimeAgo={showTimeAgo}
            hideDifficultyLabel={hideDifficultyLabel}
            hideDifficulty={hideDifficulty}
            lastOpenedAt={getLastOpenedAt ? getLastOpenedAt(item.id) : undefined}
          />
        </View>
      ),
      [handleItemPress, showTimeAgo, hideDifficultyLabel, hideDifficulty, getLastOpenedAt, vertical]
    );

    if (isLoading) {
      return (
        <View style={styles.container}>
          <SectionTitle title={title} />
          <View style={styles.loadingContainer}>
            <LoadingContainer />
          </View>
        </View>
      );
    }

    if (displayedArticles.length === 0) {
      return (
        <View style={styles.container}>
          <SectionTitle title={title} />
          <View style={styles.emptyContainer}>
            <ThemedText type="body" variant="subtle">
              {emptyStateMessage || 'No articles found'}
            </ThemedText>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <SectionTitle title={title} />
        <FlatList
          data={displayedArticles}
          renderItem={renderItem}
          keyExtractor={item => `article-${item.id}`}
          horizontal={!vertical}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={vertical ? styles.verticalList : styles.horizontalList}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{
            viewAreaCoveragePercentThreshold: 50,
          }}
        />
      </View>
    );
  }
);

ArticleSection.displayName = 'ArticleSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  horizontalList: {
    paddingLeft: LAYOUT.SPACING.MEDIUM,
  },
  verticalList: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  horizontalArticleContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  verticalArticleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  loadingContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ArticleSection;
