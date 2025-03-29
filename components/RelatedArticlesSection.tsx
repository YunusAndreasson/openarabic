import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { LAYOUT } from '@/constants/layout';
import type { RelatedArticlesSectionProps as RelatedArticlesSectionPropsType } from '@/types/ui/article.types';
import SectionTitle from './SectionTitle';

export type RelatedArticlesSectionProps = RelatedArticlesSectionPropsType;

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
