import { memo, useMemo } from 'react';
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
  ({ article, articlesData }) => {
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
        />
        <RelatedArticlesByFilter
          currentArticleId={currentArticleId}
          articlesData={articlesData}
          filterType="category"
          filterId={categoryId}
          filterName={article.category.name}
        />
      </View>
    );
  },
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

const styles = StyleSheet.create({
  // No horizontal padding here: each section below sets the screen inset once,
  // so its label and cards share the left edge the article text reads from.
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    // paddingBottom removed - FlashList contentContainerStyle handles bottom spacing
  },
});
