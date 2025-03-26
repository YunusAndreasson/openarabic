import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import SectionTitle from './SectionTitle';
import ThemedCard from './ThemedCard';
import { articlesService } from '@/services/articles';
import { ThemedText } from './ThemedText';

interface FeaturedArticleItemProps {
  article: Article;
  index: number;
  totalCount: number;
  onPress: (article: Article) => void;
}

/**
 * Individual featured article item with animation
 */
const FeaturedArticleItem = React.memo(
  ({ article, index, totalCount, onPress }: FeaturedArticleItemProps) => {
    // Add queryClient for prefetching
    const queryClient = useQueryClient();

    // Create handler with prefetching
    const handlePress = useCallback(() => {
      // Always prefetch article data with no caching
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
        staleTime: 0, // No caching
        gcTime: 0, // No cache retention
      });

      // Call the original onPress handler
      onPress(article);
    }, [article, onPress, queryClient]);

    return (
      <View style={index < totalCount - 1 ? styles.itemMargin : undefined}>
        <ThemedCard
          variant="article"
          imageUrl={article.image_url || 'https://picsum.photos/800/400'}
          title={article.title}
          category={article.category?.name || 'Uncategorized'}
          author={article.author?.name || 'Anonymous'}
          summary={article.summary || undefined}
          onPress={handlePress}
          style={styles.card}
        />
      </View>
    );
  }
);

interface FeaturedArticleSectionProps {
  /**
   * Title for the section
   */
  title: string;

  /**
   * Array of featured articles to display
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
}

/**
 * A section displaying featured articles in a vertical stack
 */
const FeaturedArticleSection = React.memo(
  ({ title, articles, onArticlePress }: FeaturedArticleSectionProps) => {
    // Always render the section header, even if there are no articles
    return (
      <View style={styles.section}>
        <SectionTitle title={title} />
        {articles && articles.length > 0 ? (
          <View style={styles.contentContainer}>
            {articles.map((article, index) => (
              <FeaturedArticleItem
                key={`featured-${article.id}`}
                article={article}
                index={index}
                totalCount={articles.length}
                onPress={onArticlePress}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No featured articles available</ThemedText>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  section: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  itemMargin: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    width: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  emptyContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.7,
  },
});

FeaturedArticleSection.displayName = 'FeaturedArticleSection';
FeaturedArticleItem.displayName = 'FeaturedArticleItem';

export default FeaturedArticleSection;
