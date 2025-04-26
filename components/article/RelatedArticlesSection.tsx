import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import SectionTitle from '../../components/SectionTitle';
import { LAYOUT } from '../../constants/layout';
import type { Article } from '../../types/articles.types';

export interface RelatedArticlesSectionProps {
  title: string;
  articles: Article[];
  renderArticleCard: (article: Article) => React.ReactNode;
}

const ITEM_WIDTH = 280; // Approximate width of each article card

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
  listContainer: {
    height: 200, // Fixed height for FlashList
  },
});

// Memoized related articles section for better performance
export const RelatedArticlesSection = memo(
  ({ title, articles, renderArticleCard }: RelatedArticlesSectionProps) => {
    const renderItem = useCallback(
      // eslint-disable-next-line react/no-unused-prop-types
      ({ item }: { item: Article }) => (
        <View style={styles.articleContainer}>{renderArticleCard(item)}</View>
      ),
      [renderArticleCard]
    );

    return (
      <View style={styles.container}>
        <SectionTitle title={title} />
        <View style={styles.listContainer}>
          <FlashList
            data={articles}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            estimatedItemSize={ITEM_WIDTH}
            drawDistance={ITEM_WIDTH * 2}
            removeClippedSubviews={true}
            keyExtractor={item => `related-${item.id}`}
          />
        </View>
      </View>
    );
  }
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

export default RelatedArticlesSection;
