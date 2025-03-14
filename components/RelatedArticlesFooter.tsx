import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';

// Components
import { RelatedArticlesSection } from '@/components/RelatedArticlesSection';

// Constants
import { LAYOUT } from '@/constants/layout';

// Types
import type { Article } from '@/types/articles.types';

interface RelatedArticlesFooterProps {
  otherArticles: Article[];
  otherCategoryArticles: Article[];
  article: Article;
  renderArticleCard: (article: Article) => React.ReactNode;
}

const styles = StyleSheet.create({
  relatedArticlesContainer: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
});

export const RelatedArticlesFooter: React.FC<RelatedArticlesFooterProps> = ({
  otherArticles,
  otherCategoryArticles,
  article,
  renderArticleCard,
}) => {
  if (!otherArticles.length && !otherCategoryArticles.length) return null;

  return (
    <View style={styles.relatedArticlesContainer}>
      {otherArticles.length > 0 && (
        <RelatedArticlesSection
          title={`More from ${article?.author?.name}`}
          articles={otherArticles}
          renderArticleCard={renderArticleCard}
        />
      )}

      {otherCategoryArticles.length > 0 && (
        <RelatedArticlesSection
          title={`More from ${article?.category?.name}`}
          articles={otherCategoryArticles}
          renderArticleCard={renderArticleCard}
        />
      )}
    </View>
  );
};

export default RelatedArticlesFooter;
