import React, { memo } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';

import { ThemedCard } from '@/components';
import SectionTitle from '@/components/SectionTitle';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

import type { Article } from '../../types/articles.types';

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
            accessibilityLabel={`${title} articles`}
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
                  hideDifficulty={hideDifficulty}
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
  articleCard: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    // Removed margins - SectionTitle handles all section spacing
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  scrollContent: {
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
});

export default ArticleSection;
