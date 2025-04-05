import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';
import { capitalizeFirstLetter } from '../../utils/stringUtils';

import { RelatedArticlesSection } from './RelatedArticlesSection';

interface RelatedArticlesFooterProps {
  otherArticles: Article[];
  otherCategoryArticles: Article[];
  article: Article | null;
  renderArticleCard: (article: Article) => React.ReactNode;
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
});

export const RelatedArticlesFooter: React.FC<RelatedArticlesFooterProps> = ({
  otherArticles,
  otherCategoryArticles,
  article,
  renderArticleCard,
}): React.ReactElement | null => {
  if (!otherArticles.length && !otherCategoryArticles.length) return null;

  return (
    <View style={styles.container}>
      {otherArticles.length > 0 ? (
        <RelatedArticlesSection
          title={`By ${article?.author?.name}`}
          articles={otherArticles}
          renderArticleCard={renderArticleCard}
        />
      ) : null}

      {otherCategoryArticles.length > 0 ? (
        <RelatedArticlesSection
          title={`In ${article?.category?.name ? capitalizeFirstLetter(article.category.name) : ''}`}
          articles={otherCategoryArticles}
          renderArticleCard={renderArticleCard}
        />
      ) : null}
    </View>
  );
};

export default RelatedArticlesFooter;
