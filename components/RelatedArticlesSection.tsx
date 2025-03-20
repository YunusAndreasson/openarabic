import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '@/hooks/animations';
import type { RelatedArticlesSectionProps as RelatedArticlesSectionPropsType } from '@/types/ui.types';

export interface RelatedArticlesSectionProps extends RelatedArticlesSectionPropsType {}

const styles = StyleSheet.create({
  container: {
    marginTop: LAYOUT.SPACING.XXLARGE,
    marginHorizontal: -LAYOUT.SPACING.LARGE,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    fontWeight: '600',
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
          style={animatedStyle as any}
        >
          {articles.map(renderArticleCard)}
        </Animated.ScrollView>
      </View>
    );
  }
);
