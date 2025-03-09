import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import { CompactArticleCard } from './CompactArticleCard';
import AnimatedSection from './AnimatedSection';
import { ThemedText } from './ThemedText';

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
  }: ArticleSectionProps) => {
    // Memoize the render item function
    const renderItem = useCallback(
      ({ item }: { item: Article }) => (
        <View style={vertical ? styles.verticalCard : undefined}>
          <CompactArticleCard
            article={item}
            onPress={() => onArticlePress(item)}
            showTimeAgo={showTimeAgo}
          />
        </View>
      ),
      [onArticlePress, showTimeAgo, vertical]
    );

    // Limit the number of articles if maxItems is specified
    const displayArticles = maxItems ? articles.slice(0, maxItems) : articles;

    // Handle empty state if there are no articles and an empty state message is provided
    if ((!articles || articles.length === 0) && emptyStateMessage) {
      return (
        <AnimatedSection title={title} delay={delay} style={styles.section}>
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{emptyStateMessage}</ThemedText>
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
          contentContainerStyle={[styles.listContent, vertical && styles.verticalListContent]}
          data={displayArticles}
          keyExtractor={article => `article-${article.id}`}
          renderItem={renderItem}
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
        />
      </AnimatedSection>
    );
  }
);

const styles = StyleSheet.create({
  section: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  verticalListContent: {
    flexDirection: 'column',
  },
  verticalCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  emptyContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
});

ArticleSection.displayName = 'ArticleSection';

export default ArticleSection;
