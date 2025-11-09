import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useRef, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';

import { ArticleCard } from './ArticleCard';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';
// Haptics for scroll position changes are non-semantic; avoid to reduce noise

interface HorizontalArticleSliderProps {
  articles: Article[];
}

// Calculate card width based on screen width and spacing
const CARD_SPACING = LAYOUT.SPACING.MEDIUM;
const CARD_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width for better visibility
// Fixed height now that summary is limited to 5 lines
// Analysis: ArticleCard contains image (~40% of height) + title (2 lines) + author (1 line) + summary (5 lines) + reduced padding
const BASE_CONTENT_HEIGHT = LAYOUT.SPACING.XXXLARGE * 7.5 - LAYOUT.SPACING.MEDIUM; // Reduced for minimal bottom padding
const CARD_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM + BASE_CONTENT_HEIGHT;

// Pure function for FlashList key extraction
const keyExtractor = (item: Article) => `featured-${item.id}`;

/**
 * Horizontal slider displaying multiple articles in a swipeable ScrollView
 */
const HorizontalArticleSliderComponent: FC<HorizontalArticleSliderProps> = ({ articles }) => {
  const colors = useColors();
  const lastVisibleCardIndex = useRef<number>(-1);

  // Limit to 5 articles for the slider
  const displayArticles = articles.slice(0, 5);

  // Note: Navigation is now handled by Link component in ArticleCard
  // Note: No progress indicators in main library carousel - only in list views

  // Memoize the article cards to prevent unnecessary re-renders

  // v2 handles layout automatically - no size estimates needed

  const renderItem = useCallback(
    (info: { item: Article; index: number }) => {
      const containerStyle = [
        styles.cardContainer,
        {
          height: CARD_HEIGHT,
          marginLeft: info.index === 0 ? 0 : CARD_SPACING,
        },
      ];

      const cardStyle = [
        styles.card,
        { backgroundColor: colors.card },
        { ...LAYOUT.ELEVATION.SUBTLE, shadowColor: colors.shadow },
      ];

      return (
        <View style={containerStyle}>
          <ArticleCard
            article={info.item}
            author={info.item.author.name}
            category={info.item.category.name}
            imageUrl={generateImageUrl(info.item.image_url)}
            style={cardStyle}
            summary={String(info.item.summary)}
            title={info.item.title}
            testID={`slider-article-${info.item.id}`}
            isFeaturedArticle={true}
          />
        </View>
      );
    },
    [colors.card, colors.shadow],
  );

  // Skip rendering if no articles
  if (!articles.length) return null;

  return (
    <View style={styles.container}>
      <FlashList
        horizontal
        data={displayArticles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        removeClippedSubviews={true}
        // v2 performance optimizations
        maxItemsInRecyclePool={8} // Control memory usage for horizontal slider
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        bounces={true}
        overScrollMode="always"
        onViewableItemsChanged={({ viewableItems }) => {
          const first = viewableItems[0]?.index ?? -1;
          if (
            first !== -1 &&
            first !== lastVisibleCardIndex.current &&
            lastVisibleCardIndex.current !== -1
          ) {
            // intentionally no haptic here; scrolling is non-semantic
          }
          lastVisibleCardIndex.current = first;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // FilterSection provides its own marginTop for proper section spacing
  },
  scrollContainer: {
    paddingTop: LAYOUT.SPACING.TINY,
    paddingLeft: LAYOUT.SPACING.MEDIUM, // Left edge padding for first card
  },
  cardContainer: {
    width: CARD_WIDTH,
    // height is set to constant CARD_HEIGHT in containerStyle
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

export const HorizontalArticleSlider = memo(HorizontalArticleSliderComponent);
HorizontalArticleSlider.displayName = 'HorizontalArticleSlider';
