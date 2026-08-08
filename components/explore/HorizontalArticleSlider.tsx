import { memo, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { MAX_FEATURED_ARTICLES } from '@/hooks/articles/useMultipleFeaturedArticles';

import { ArticleCard } from './ArticleCard';
import type { Article } from '@/types/articles.types';
import { buildArticleCardProps } from '@/utils/articleUtils';

interface HorizontalArticleSliderProps {
  articles: Article[];
}

// Calculate card width based on screen width and spacing
const CARD_SPACING = LAYOUT.SPACING.SMALL; // 8px
const CARD_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width for better visibility
// Fixed height for article cards in horizontal slider.
// Title/author overlay the image, so content area only needs to fit the summary
// (caption type, ~4 lines) plus vertical padding. 5.5 × XXXLARGE (48px) = 264px
// matches the empirically-tuned content height; keep as a named constant.
const CONTENT_HEIGHT_UNITS = 5.5; // multiples of LAYOUT.SPACING.XXXLARGE
const BASE_CONTENT_HEIGHT = LAYOUT.SPACING.XXXLARGE * CONTENT_HEIGHT_UNITS;
const CARD_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM + BASE_CONTENT_HEIGHT;

// Card style override: BaseCard already applies background, shadowColor, and the
// MEDIUM elevation. Slider cards want SUBTLE elevation instead and need to fill
// their fixed-dimension parent container — declared once at module scope.
const SLIDER_CARD_STYLE = {
  width: '100%',
  height: '100%',
  ...LAYOUT.ELEVATION.SUBTLE,
} as const;

/**
 * Horizontal slider displaying multiple articles in a swipeable ScrollView.
 * Uses ScrollView with snapToOffsets for precise snap behavior.
 */
const HorizontalArticleSliderComponent: FC<HorizontalArticleSliderProps> = ({ articles }) => {
  const displayArticles = articles.slice(0, MAX_FEATURED_ARTICLES);

  const snapOffsets = displayArticles.map((_, index) => index * (CARD_WIDTH + CARD_SPACING));

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
      >
        {displayArticles.map(article => (
          <View key={`featured-${article.id}`} style={styles.cardContainer}>
            <ArticleCard
              article={article}
              {...buildArticleCardProps(article)}
              style={SLIDER_CARD_STYLE}
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
    // Label-to-cards gap is owned by SectionLabel.paddingBottom (8px) — match other sliders.
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    gap: CARD_SPACING,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
});

export const HorizontalArticleSlider = memo(HorizontalArticleSliderComponent);
HorizontalArticleSlider.displayName = 'HorizontalArticleSlider';
