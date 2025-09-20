import { Link } from 'expo-router';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListenListItemCard } from '@/components/bookmarks/ListenListItemCard';
import { LAYOUT } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { useMultipleFeaturedArticles } from '@/hooks/articles/useMultipleFeaturedArticles';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';

interface RelatedArticlesSectionProps {
  /**
   * The current article ID to exclude from recommendations
   */
  currentArticleId: number;

  /**
   * The articles data to select from
   */
  articlesData: Article[];

  /**
   * Maximum number of related articles to show (default: 5)
   */
  maxArticles?: number;
}

/**
 * Related Articles Section Component
 *
 * Displays intelligently selected related articles at the end of article content.
 * Uses existing article selection logic for consistency and efficiency.
 */
export const RelatedArticlesSection = memo<RelatedArticlesSectionProps>(
  ({ currentArticleId, articlesData, maxArticles = 5 }) => {
    // Filter out current article efficiently with memoization
    const filteredArticles = useMemo(() => {
      return articlesData.filter(article => article.id !== currentArticleId);
    }, [articlesData, currentArticleId]);

    // Use existing intelligent selection logic for consistency
    const { articles: selectedArticles } = useMultipleFeaturedArticles(
      filteredArticles,
      0, // No refresh for stability in article context
      `article-${currentArticleId}` // Unique scope per article for cache consistency
    );

    // Limit to requested number of articles
    const relatedArticles = useMemo(() => {
      return selectedArticles.slice(0, maxArticles);
    }, [selectedArticles, maxArticles]);

    // Note: Navigation is now handled by Link component with dangerouslySingular

    // Memoize the article cards to prevent unnecessary re-renders
    const articleCards = useMemo(() => {
      return relatedArticles.map((article, index) => (
        <View key={article.id} style={index > 0 ? styles.articleSpacing : undefined}>
          <Link
            href={getArticleRoute(article.id, article.title)}
            replace
            dangerouslySingular={true}
            asChild
          >
            <ListenListItemCard
              title={article.title}
              author={article.author.name}
              difficultyLevel={article.difficulty_level}
              imageUrl={generateImageUrl(article.image_url)}
            />
          </Link>
        </View>
      ));
    }, [relatedArticles]);

    // Early return if no articles to show
    if (relatedArticles.length === 0) {
      return null;
    }

    return <View style={styles.container}>{articleCards}</View>;
  }
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  articleSpacing: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
