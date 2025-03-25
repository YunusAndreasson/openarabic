import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import type { RelatedArticlesSectionProps as RelatedArticlesSectionPropsType } from '@/types/ui/article.types';

export interface RelatedArticlesSectionProps extends RelatedArticlesSectionPropsType {}

const styles = StyleSheet.create({
  container: {
    marginTop: LAYOUT.SPACING.XXLARGE,
    marginHorizontal: -LAYOUT.SPACING.LARGE,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
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
        <View style={styles.titleContainer}>
          <ThemedText type="heading3">{title}</ThemedText>
        </View>
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
