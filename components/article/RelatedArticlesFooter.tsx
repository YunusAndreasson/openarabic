import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';

import ArticleSection from './ArticleSection';

interface RelatedArticlesFooterProps {
  otherArticles: Article[];
  article: Article | null;
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
  article,
  onArticlePress,
}): React.ReactElement | null => {
  if (!otherArticles.length) return null;

  return (
    <View style={styles.container}>
      {otherArticles.length > 0 && article?.author?.name && (
        <View>
          <ArticleSection
            articles={otherArticles}
            hideDifficulty={false}
            title={`By ${article.author.name}`}
            onArticlePress={onArticlePress || (() => {})}
          />
        </View>
      )}
    </View>
  );
};

export default RelatedArticlesFooter;
