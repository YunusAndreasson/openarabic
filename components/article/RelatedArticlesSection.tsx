import React, { memo, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { RelatedArticlesByFilter } from '@/components/article/RelatedArticlesByFilter';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';

interface RelatedArticlesSectionProps {
  /**
   * The current article to get author and category from
   */
  article: Article;

  /**
   * The articles data to select from
   */
  articlesData: Article[];

  /**
   * Maximum number of related articles to show per section (default: 5)
   */
  maxArticles?: number;

  /**
   * Callback fired when related articles section becomes visible
   * Used as heuristic to mark article as 100% complete
   */
  onVisible?: () => void;
}

/**
 * Related Articles Section Component
 *
 * Displays two sections of intelligently selected related articles:
 * - More from [author name]
 * - More from [category name]
 *
 * Shows only unread or low-progress articles (< 20%) to always offer fresh content.
 * Uses existing article selection logic for consistency and efficiency.
 */
export const RelatedArticlesSection = memo<RelatedArticlesSectionProps>(
  ({ article, articlesData, maxArticles = 5, onVisible }) => {
    // Track if we've already fired the callback
    const hasCalledOnVisibleRef = useRef(false);

    // Fire callback when either section becomes visible
    // This serves as a heuristic to mark article as 100% complete
    const handleSectionVisible = useCallback(() => {
      if (!hasCalledOnVisibleRef.current && onVisible) {
        hasCalledOnVisibleRef.current = true;
        onVisible();
      }
    }, [onVisible]);

    // Memoize article IDs for efficient comparison
    const currentArticleId = article.id;
    const authorId = article.author_id;
    const categoryId = article.category_id;

    // Quick check to see if we have any matching articles (avoid empty container)
    // Memoized to prevent recalculation on every render
    const hasAuthorArticles = useMemo(() => {
      return articlesData.some(a => a.id !== currentArticleId && a.author_id === authorId);
    }, [articlesData, currentArticleId, authorId]);

    const hasCategoryArticles = useMemo(() => {
      return articlesData.some(a => a.id !== currentArticleId && a.category_id === categoryId);
    }, [articlesData, currentArticleId, categoryId]);

    // Early return if no matching articles
    if (!hasAuthorArticles && !hasCategoryArticles) {
      return null;
    }

    // Render both sections - they will return null internally if no articles found after filtering
    return (
      <View style={styles.container}>
        <RelatedArticlesByFilter
          currentArticleId={currentArticleId}
          articlesData={articlesData}
          filterType="author"
          filterId={authorId}
          filterName={article.author.name}
          maxArticles={maxArticles}
          onVisible={handleSectionVisible}
        />
        <RelatedArticlesByFilter
          currentArticleId={currentArticleId}
          articlesData={articlesData}
          filterType="category"
          filterId={categoryId}
          filterName={article.category.name}
          maxArticles={maxArticles}
          onVisible={handleSectionVisible}
        />
      </View>
    );
  },
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    // paddingBottom removed - FlashList contentContainerStyle handles bottom spacing
  },
});
