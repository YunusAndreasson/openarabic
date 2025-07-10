import { router } from 'expo-router';
import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ArticleCard } from '@/components/home/ArticleCard';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMultipleFeaturedArticles } from '@/hooks/articles/useMultipleFeaturedArticles';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { selectionFeedback } from '@/utils/haptics';

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

  /**
   * Optional custom title for the section
   */
  sectionTitle?: string;
}

/**
 * Related Articles Section Component
 *
 * Displays intelligently selected related articles at the end of article content.
 * Uses existing article selection logic for consistency and efficiency.
 */
export const RelatedArticlesSection = memo<RelatedArticlesSectionProps>(
  ({
    currentArticleId,
    articlesData,
    maxArticles = 5,
    onArticlePress,
    sectionTitle = STRINGS.CONTINUE_READING,
  }) => {
    const colors = useColors();

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
    const defaultNavigationHandler = useCallback((article: Article) => {
      selectionFeedback();
      router.replace(getArticleRoute(article.id, article.title));
    }, []);

    const handleArticlePress = onArticlePress || defaultNavigationHandler;

    // Memoized styles for performance
    const sectionTitleStyle = useMemo(
      () => ({
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
        color: colors.tint,
        marginBottom: LAYOUT.SPACING.MEDIUM,
        textAlign: 'left' as const,
      }),
      [colors.tint]
    );

    // Early return if no articles to show
    if (relatedArticles.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <ThemedText style={sectionTitleStyle}>{sectionTitle}</ThemedText>

        {relatedArticles.map((article, index) => (
          <View key={article.id} style={index > 0 ? styles.articleSpacing : undefined}>
            <ArticleCard
              title={article.title}
              author={article.author.name}
              difficultyLevel={article.difficulty_level}
              imageUrl={article.image_url || undefined}
              onPress={() => handleArticlePress(article)}
            />
          </View>
        ))}
      </View>
    );
  }
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleSpacing: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
