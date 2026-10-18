import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RelatedArticlesByFilter } from '@/components/article/RelatedArticlesByFilter';
import { LAYOUT } from '@/constants/layout';
import { useRelatedArticles } from '@/hooks/articles/useRelatedArticles';
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
 * Two lists at the foot of the reader:
 * - More from [author name]
 * - More in [category name]
 *
 * A text by this author in this category qualifies for both. It is shown once,
 * in the author list: the category list leaves out what the author list chose.
 */
export const RelatedArticlesSection = memo<RelatedArticlesSectionProps>(
  ({ article, articlesData }) => {
    const byAuthor = useRelatedArticles({
      currentArticleId: article.id,
      articlesData,
      filterType: 'author',
      filterId: article.author_id,
    });

    const byCategory = useRelatedArticles({
      currentArticleId: article.id,
      articlesData,
      filterType: 'category',
      filterId: article.category_id,
      excludeIds: new Set(byAuthor.articles.map(related => related.id)),
    });

    // Nothing to recommend: no empty container
    if (byAuthor.articles.length === 0 && byCategory.articles.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <RelatedArticlesByFilter
          filterType="author"
          filterName={article.author.name}
          articles={byAuthor.articles}
          progressMap={byAuthor.progressMap}
        />
        <RelatedArticlesByFilter
          filterType="category"
          filterName={article.category.name}
          articles={byCategory.articles}
          progressMap={byCategory.progressMap}
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
