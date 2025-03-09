import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import Animated from 'react-native-reanimated';
import type { Article } from '@/types/articles.types';
import { useFadeInAnimation } from '@/hooks/animations';

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
  ({ title, articles, renderArticleCard }: RelatedArticlesSectionProps) => {
    const { animatedStyle, startAnimation } = useFadeInAnimation(0, 300);

    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={true}
          style={animatedStyle}
        >
          {articles.map(renderArticleCard)}
        </Animated.ScrollView>
      </View>
    );
  }
);
