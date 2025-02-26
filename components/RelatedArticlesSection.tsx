import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { Article } from '@/types/articles.types';

export interface RelatedArticlesSectionProps {
  title: string;
  articles: Article[];
  renderArticleCard: (article: Article) => React.ReactNode;
}

const styles = StyleSheet.create({
  container: {
    marginTop: LAYOUT.SPACING.XXLARGE,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    fontWeight: '600',
  },
  horizontalList: {
    paddingLeft: 0,
    paddingRight: LAYOUT.SCREEN_EDGE_PADDING,
    marginHorizontal: 0,
  },
});

// Memoized related articles section for better performance
export const RelatedArticlesSection = React.memo(
  ({ title, articles, renderArticleCard }: RelatedArticlesSectionProps) => (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        removeClippedSubviews={true}
        entering={FadeIn.duration(300)}
      >
        {articles.map(renderArticleCard)}
      </Animated.ScrollView>
    </View>
  )
);
