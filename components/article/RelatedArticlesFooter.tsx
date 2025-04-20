import React from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';
import { capitalizeFirstLetter } from '../../utils/stringUtils';

import { RelatedArticlesSection } from './RelatedArticlesSection';

interface RelatedArticlesFooterProps {
  otherArticles: Article[];
  otherCategoryArticles: Article[];
  article: Article | null;
  renderArticleCard: (article: Article) => React.ReactNode;
  onAuthorPress?: (author: Tables<'authors'>) => void;
  onCategoryPress?: (category: Tables<'categories'>) => void;
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
  onAuthorPress,
  onCategoryPress,
}): React.ReactElement | null => {
  if (!otherArticles.length && !otherCategoryArticles.length) return null;

  const handleAuthorPress = () => {
    if (onAuthorPress && article?.author) {
      onAuthorPress(article.author);
    }
  };

  const handleCategoryPress = () => {
    if (onCategoryPress && article?.category) {
      onCategoryPress(article.category);
    }
  };

  return (
    <View style={styles.container}>
      {otherArticles.length > 0 && article?.author?.name && (
        <View>
          <TouchableOpacity
            onPress={onAuthorPress ? handleAuthorPress : undefined}
            disabled={!onAuthorPress}
          >
            <RelatedArticlesSection
              title={`By ${article.author.name}`}
              articles={otherArticles}
              renderArticleCard={renderArticleCard}
            />
          </TouchableOpacity>
        </View>
      )}

      {otherCategoryArticles.length > 0 && article?.category?.name && (
        <View>
          <TouchableOpacity
            onPress={onCategoryPress ? handleCategoryPress : undefined}
            disabled={!onCategoryPress}
          >
            <RelatedArticlesSection
              title={`In ${capitalizeFirstLetter(article.category.name)}`}
              articles={otherCategoryArticles}
              renderArticleCard={renderArticleCard}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default RelatedArticlesFooter;
