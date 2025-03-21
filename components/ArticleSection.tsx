import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import { AnimatedSection } from './index';
import { ThemedText } from './ThemedText';
import { articlesService } from '@/services/articles';
import ThemedCard from './ThemedCard';

interface ArticleSectionProps {
  /**
   * Title for the section
   */
  title: string;

  /**
   * Array of articles to display
   */
  articles: Article[];

  /**
   * Callback when an article is pressed
   */
  onArticlePress: (article: Article) => void;

  /**
   * Animation delay in milliseconds
   */
  delay?: number;

  /**
   * Whether to show the time ago indicator
   */
  showTimeAgo?: boolean;

  /**
   * Whether to use a vertical layout instead of horizontal
   */
  vertical?: boolean;

  /**
   * Maximum number of articles to display
   */
  maxItems?: number;

  /**
   * Message to display when there are no articles
   */
  emptyStateMessage?: string;

  /**
   * Whether to hide the difficulty label text
   */
  hideDifficultyLabel?: boolean;

  /**
   * Whether to completely hide the difficulty indicator
   */
  hideDifficulty?: boolean;

  /**
   * Function to get the last opened timestamp for an article
   */
  getLastOpenedAt?: (articleId: number) => string | undefined;
}

/**
 * A reusable component for displaying a section of articles
 */
const ArticleSection = React.memo(
  ({
    title,
    articles,
    onArticlePress,
    delay = 0,
    showTimeAgo = false,
    vertical = false,
    maxItems,
    emptyStateMessage,
    hideDifficultyLabel = false,
    hideDifficulty = false,
    getLastOpenedAt,
  }: ArticleSectionProps) => {
    // Add queryClient for prefetching
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

    // Handle empty state if there are no articles and an empty state message is provided
    if ((!articles || articles.length === 0) && emptyStateMessage) {
      return (
        <AnimatedSection title={title} delay={delay} style={styles.section}>
          <View style={styles.emptyContainer}>
            <ThemedText type="body" variant="subtle">
              {emptyStateMessage}
            </ThemedText>
          </View>
        </AnimatedSection>
      );
    }

    // Skip rendering if no articles and no empty state message
    if (!articles || articles.length === 0) return null;

    return (
      <AnimatedSection title={title} delay={delay} style={styles.section}>
        <FlatList
          horizontal={!vertical}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            vertical ? styles.verticalListContent : styles.horizontalListContent,
          ]}
          data={displayedArticles}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 300,
          }}
        />
      </AnimatedSection>
    );
  }
);

const styles = StyleSheet.create({
  section: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  horizontalListContent: {
    paddingLeft: LAYOUT.SPACING.MEDIUM,
    paddingRight: LAYOUT.SCREEN_EDGE_PADDING,
  },
  verticalListContent: {
    padding: LAYOUT.SPACING.MEDIUM,
  },
  listContent: {
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  emptyContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

ArticleSection.displayName = 'ArticleSection';

export default ArticleSection;
