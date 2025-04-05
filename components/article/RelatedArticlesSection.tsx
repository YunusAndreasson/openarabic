import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import SectionTitle from '../../components/SectionTitle';
import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';

export interface RelatedArticlesSectionProps {
  title: string;
  articles: Article[];
  renderArticleCard: (article: Article) => React.ReactNode;
}

const styles = StyleSheet.create({
  articleContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    marginHorizontal: -LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.XXLARGE,
  },
  horizontalList: {
    paddingLeft: LAYOUT.SPACING.LARGE,
    paddingRight: LAYOUT.SPACING.LARGE,
  },
});

// Memoized related articles section for better performance
export const RelatedArticlesSection = memo(
  ({ title, articles, renderArticleCard }: RelatedArticlesSectionProps) => {
    return (
      <View style={styles.container}>
        <SectionTitle title={title} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={true}
        >
          {articles.map(article => (
            <View key={article.id} style={styles.articleContainer}>
              {renderArticleCard(article)}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

export default RelatedArticlesSection;
