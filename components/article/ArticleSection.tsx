import React, { memo } from 'react';
import { StyleSheet, View, Platform, ScrollView, ActivityIndicator } from 'react-native';

import SectionTitle from '@/components/SectionTitle';
import { ThemedCard } from '@/components';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '../../types/articles.types';
import { useColors } from '@/hooks/useColors';

interface ArticleSectionProps {
  /**
   * Section title
   */
  title: string;

  /**
   * Articles to display
   */
  articles: (Article & { dueWordCount?: number })[];

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
const ArticleSection = memo(
  ({
    title,
    articles,
    onArticlePress,
    hideDifficulty = false,
    getLastOpenedAt,
    isLoading = false,
  }: ArticleSectionProps) => {
    const colors = useColors();

    // If no articles and not loading, don't render anything
    if (articles.length === 0 && !isLoading) return null;

    // Handle viewability change for prefetching

    return (
      <View style={styles.container} testID={`article-section-${title}`}>
        <SectionTitle title={title} />
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            accessibilityLabel={`Scroll ${title}`}
          >
            {articles.map(article => {
              // Get last opened timestamp if provided
              const lastOpenedAt = getLastOpenedAt?.(article.id);

              return (
                <ThemedCard
                  key={`article-${article.id}`}
                  style={styles.articleCard}
                  variant="compact"
                  article={article}
                  handlePress={() => onArticlePress(article)}
                  hideDifficulty={false}
                  lastOpenedAt={lastOpenedAt}
                  showTimeAgo={!!lastOpenedAt}
                  dueWordCount={article.dueWordCount}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }
);

ArticleSection.displayName = 'ArticleSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  horizontalArticleContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    ...Platform.select({
      android: {
        paddingBottom: 2,
      },
    }),
  },
  horizontalList: {
    // Empty after removing horizontal padding
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  verticalArticleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    ...Platform.select({
      android: {
        paddingBottom: 2,
      },
    }),
  },
  verticalList: {
    // Empty after removing horizontal padding
  },
  scrollContent: {
    // paddingHorizontal removed to match other sections
  },
  articleCard: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
});

export default ArticleSection;
