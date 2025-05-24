import React, { memo } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';

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
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  scrollContent: {
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  articleCard: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
});

export default ArticleSection;
