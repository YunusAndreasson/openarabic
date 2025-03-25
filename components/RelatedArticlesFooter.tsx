import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { RelatedArticlesSection } from '@/components/RelatedArticlesSection';
import { LAYOUT } from '@/constants/layout';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { Article } from '@/types/articles.types';

interface RelatedArticlesFooterProps {
  otherArticles: Article[];
  otherCategoryArticles: Article[];
  article: Article | null;
  renderArticleCard: (article: Article) => React.ReactNode;
}

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    marginHorizontal: 0,
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
      {otherArticles.length > 0 && (
        <RelatedArticlesSection
          title={`By ${article?.author?.name}`}
          articles={otherArticles}
          renderArticleCard={renderArticleCard}
        />
      )}

      {otherCategoryArticles.length > 0 && (
        <RelatedArticlesSection
          title={`In ${article?.category?.name ? capitalizeFirstLetter(article.category.name) : ''}`}
          articles={otherCategoryArticles}
          renderArticleCard={renderArticleCard}
        />
      )}
    </View>
  );
};

export default RelatedArticlesFooter;
