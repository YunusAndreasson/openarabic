import { useQuery } from '@tanstack/react-query';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RelatedArticlesByFilter } from '@/components/article/RelatedArticlesByFilter';
import { LAYOUT } from '@/constants/layout';
import { articleQueries } from '@/constants/queries';
import { useRelatedArticles } from '@/hooks/articles/useRelatedArticles';
import type { Article } from '@/types/articles.types';

/** Stable while the catalogue loads, so the selection hooks below see one value. */
const EMPTY_ARTICLES: Article[] = [];

interface RelatedArticlesSectionProps {
  /**
   * The current article to get author and category from
   */
  article: Article;
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
 *
 * The catalogue is a subscription, not a cache read. The reader used to pass
 * in `queryClient.getQueryData(['articles'])` read during render, which the
 * React Compiler memoises on the client's identity — so a reader opened before
 * the catalogue had loaded (a cold deep link: the list is not persisted) kept
 * an empty footer for the whole visit. `useQuery` re-renders when it lands,
 * and fetches it when nothing else has.
 */
export const RelatedArticlesSection = memo<RelatedArticlesSectionProps>(({ article }) => {
  const { data: articlesData = EMPTY_ARTICLES } = useQuery(articleQueries.all());

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
});

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

const styles = StyleSheet.create({
  // No horizontal padding here: each section below sets the screen inset once,
  // so its label and cards share the left edge the article text reads from.
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    // paddingBottom removed - FlashList contentContainerStyle handles bottom spacing
  },
});
