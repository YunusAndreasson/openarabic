import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';
import { capitalizeFirstLetter } from '../../utils/stringUtils';

import ArticleSection from './ArticleSection';

interface RelatedArticlesFooterProps {
  otherArticles: Article[];
  otherCategoryArticles: Article[];
  article: Article | null;
  onAuthorPress?: (author: Tables<'authors'>) => void;
  onCategoryPress?: (category: Tables<'categories'>) => void;
  onArticlePress?: (article: Article) => void;
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
  onArticlePress,
}): React.ReactElement | null => {
  if (!otherArticles.length && !otherCategoryArticles.length) return null;

  return (
    <View style={styles.container}>
      {otherArticles.length > 0 && article?.author?.name && (
        <View>
          <ArticleSection
            title={`By ${article.author.name}`}
            articles={otherArticles}
            onArticlePress={onArticlePress || (() => {})}
            showTimeAgo={false}
            vertical={false}
            hideDifficulty={true}
          />
        </View>
      )}

      {otherCategoryArticles.length > 0 && article?.category?.name && (
        <View>
          <ArticleSection
            title={`In ${capitalizeFirstLetter(article.category.name)}`}
            articles={otherCategoryArticles}
            onArticlePress={onArticlePress || (() => {})}
            showTimeAgo={false}
            vertical={false}
            hideDifficulty={true}
          />
        </View>
      )}
    </View>
  );
};

export default RelatedArticlesFooter;
