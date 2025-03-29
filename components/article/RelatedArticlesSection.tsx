import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { LAYOUT } from '../../constants/layout';
import { Article } from '../../types/articles.types';
import SectionTitle from '../../components/SectionTitle';

export interface RelatedArticlesSectionProps {
  title: string;
  articles: Article[];
  renderArticleCard: (article: Article) => React.ReactNode;
}

const styles = StyleSheet.create({
  container: {
    marginTop: LAYOUT.SPACING.XXLARGE,
    marginHorizontal: -LAYOUT.SPACING.SMALL,
  },
  horizontalList: {
    paddingLeft: LAYOUT.SPACING.LARGE,
    paddingRight: LAYOUT.SPACING.LARGE,
  },
});

// Memoized related articles section for better performance
export const RelatedArticlesSection = React.memo(
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
          {articles.map(renderArticleCard)}
        </ScrollView>
      </View>
    );
  }
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

export default RelatedArticlesSection;
