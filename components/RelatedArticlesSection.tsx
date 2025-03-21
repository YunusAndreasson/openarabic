import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation } from '@/hooks/animations';
import type { RelatedArticlesSectionProps as RelatedArticlesSectionPropsType } from '@/types/ui.types';

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
    const { animatedStyle, startAnimation } = useOpacityAnimation({ initialOpacity: 0, delay: 0, duration: 300 });

    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <ThemedText type="heading3">{title}</ThemedText>
        </View>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={true}
          style={animatedStyle as any}
        >
          {articles.map(renderArticleCard)}
        </Animated.ScrollView>
      </View>
    );
  }
);
