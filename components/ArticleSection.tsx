import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import { Section } from './index';
import { ThemedText } from './ThemedText';
import { articlesService } from '@/services/articles';
import ThemedCard from './ThemedCard';
import { LoadingContainer } from './Loader';
import { useColors } from '@/hooks/useColors';

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
    // Add queryClient for prefetching
    const queryClient = useQueryClient();
    const colors = useColors();

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
        // Prefetch data for articles that become visible
        viewableItems.forEach(({ item }) => {
          if (item && item.id) {
            queryClient.prefetchQuery({
              queryKey: ['article', item.id],
              queryFn: () => articlesService.getArticleById(item.id),
              staleTime: 60000, // 1 minute cache
            });
          }
        });
      },
      [queryClient]
    );

    // Render each article item
    const renderItem = useCallback(
      ({ item }: { item: Article }) => (
        <ThemedCard
          variant="compact"
          article={item}
          onPress={() => handleItemPress(item)}
          showTimeAgo={showTimeAgo}
          hideDifficultyLabel={hideDifficultyLabel}
          hideDifficulty={hideDifficulty}
          lastOpenedAt={getLastOpenedAt ? getLastOpenedAt(item.id) : undefined}
        />
      ),
      [handleItemPress, showTimeAgo, hideDifficultyLabel, hideDifficulty, getLastOpenedAt]
    );

    // If loading and no articles, show loading state
    if (isLoading && displayedArticles.length === 0) {
      return (
        <Section title={title}>
          <View style={styles.loadingContainer}>
            <LoadingContainer size="small" color={colors.text} />
          </View>
        </Section>
      );
    }

    // If empty and not loading, show empty state message or nothing
    if (displayedArticles.length === 0 && !isLoading) {
      if (emptyStateMessage) {
        return (
          <Section title={title}>
            <View style={styles.emptyContainer}>
              <ThemedText>{emptyStateMessage}</ThemedText>
            </View>
          </Section>
        );
      }
      return null; // Don't render the section at all if no items and no empty message
    }

    // Default render with articles
    return (
      <Section title={title}>
        <FlatList
          data={displayedArticles}
          renderItem={renderItem}
          keyExtractor={item => `article-${item.id}`}
          horizontal={!vertical}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 30 }}
          contentContainerStyle={[
            styles.list,
            vertical ? styles.verticalList : styles.horizontalList,
          ]}
        />
      </Section>
    );
  }
);

const styles = StyleSheet.create({
  list: {
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  horizontalList: {
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  verticalList: {
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  emptyContainer: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});

export default ArticleSection;
