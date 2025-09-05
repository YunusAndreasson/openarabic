import { router } from 'expo-router';
import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListenListItemCard } from '@/components/listen/ListenListItemCard';
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

  /**
   * Optional custom navigation handler
   */
  onArticlePress?: (article: Article) => void;
}

/**
 * Related Articles Section Component
 *
 * Displays intelligently selected related articles at the end of article content.
 * Uses existing article selection logic for consistency and efficiency.
 */
export const RelatedArticlesSection = memo<RelatedArticlesSectionProps>(
  ({ currentArticleId, articlesData, maxArticles = 5, onArticlePress }) => {
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

    // Default navigation handler using router.replace for smooth transitions
    // Haptics intentionally disabled for related articles below sentences
    const defaultNavigationHandler = useCallback((article: Article) => {
      router.replace(getArticleRoute(article.id, article.title));
    }, []);

    const handleArticlePress = onArticlePress || defaultNavigationHandler;

    // Memoize the article press handler to prevent inline function creation
    const createArticlePressHandler = useCallback(
      (article: Article) => {
        return () => handleArticlePress(article);
      },
      [handleArticlePress]
    );

    // Memoize the article cards to prevent unnecessary re-renders
    const articleCards = useMemo(() => {
      return relatedArticles.map((article, index) => (
        <View key={article.id} style={index > 0 ? styles.articleSpacing : undefined}>
          <ListenListItemCard
            title={article.title}
            author={article.author.name}
            difficultyLevel={article.difficulty_level}
            imageUrl={generateImageUrl(article.image_url)}
            onPress={createArticlePressHandler(article)}
          />
        </View>
      ));
    }, [relatedArticles, createArticlePressHandler]);

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
