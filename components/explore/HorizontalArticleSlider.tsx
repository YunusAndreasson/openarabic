import { memo, useMemo, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { MAX_FEATURED_ARTICLES } from '@/hooks/articles/useMultipleFeaturedArticles';

import { ArticleCard } from './ArticleCard';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { buildArticleCardProps } from '@/utils/articleUtils';

interface HorizontalArticleSliderProps {
  articles: Article[];
}

// Calculate card width based on screen width and spacing
const CARD_SPACING = LAYOUT.SPACING.SMALL; // 8px
const CARD_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width for better visibility
// Fixed height for article cards in horizontal slider
// Reduced since title/author now overlay the image
const BASE_CONTENT_HEIGHT = LAYOUT.SPACING.XXXLARGE * 5.5;
const CARD_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM + BASE_CONTENT_HEIGHT;

/**
 * Horizontal slider displaying multiple articles in a swipeable ScrollView.
 * Uses ScrollView with snapToOffsets for precise snap behavior.
 */
const HorizontalArticleSliderComponent: FC<HorizontalArticleSliderProps> = ({ articles }) => {
  const colors = useColors();

  const displayArticles = articles.slice(0, MAX_FEATURED_ARTICLES);

  // Compute snap offsets for each card position
  const snapOffsets = useMemo(
    () => displayArticles.map((_, index) => index * (CARD_WIDTH + CARD_SPACING)),
    [displayArticles.length],
  );

  // Pre-compute card styles to avoid recreation on each render
  const cardStyle = useMemo(
    () => [
      styles.card,
      { backgroundColor: colors.card },
      { ...LAYOUT.ELEVATION.SUBTLE, shadowColor: colors.shadow },
    ],
    [colors.card, colors.shadow],
  );

  if (!articles.length) return null;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        decelerationRate="fast"
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        scrollEventThrottle={16}
        bounces={true}
        overScrollMode="always"
      >
        {displayArticles.map((article, index) => (
          <View
            key={`featured-${article.id}`}
            style={index === 0 ? styles.cardContainerFirst : styles.cardContainer}
          >
            <ArticleCard
              article={article}
              {...buildArticleCardProps(article)}
              style={cardStyle}
              testID={`slider-article-${article.id}`}
              isFeaturedArticle={true}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingTop: LAYOUT.SPACING.TINY,
    paddingRight: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  cardContainerFirst: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginLeft: CARD_SPACING,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

export const HorizontalArticleSlider = memo(HorizontalArticleSliderComponent);
HorizontalArticleSlider.displayName = 'HorizontalArticleSlider';
