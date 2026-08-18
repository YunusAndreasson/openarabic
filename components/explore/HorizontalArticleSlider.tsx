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

// Slider cards fill their fixed-dimension parent container — declared once at
// module scope. The elevation step-down is an `elevation` prop now; it used to
// be a raw token spread into this override, which skipped the theme-aware
// wrapper entirely.
const SLIDER_CARD_STYLE = {
  width: '100%',
  height: '100%',
} as const;

/**
 * Horizontal slider displaying multiple articles in a swipeable ScrollView.
 * Snaps by a single interval, since every card is the same width.
 */
const HorizontalArticleSliderComponent: FC<HorizontalArticleSliderProps> = ({ articles }) => {
  if (!articles.length) return null;

  const displayArticles = articles.slice(0, MAX_FEATURED_ARTICLES);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A ScrollView carries RN's `baseHorizontal` — `flexGrow: 1,
      // flexShrink: 1` — and this one is now a direct child of the section
      // rather than sitting inside a plain View, which was flex-inert and
      // absorbed both. Left as-is the rail would stretch past CARD_HEIGHT
      // wherever there is spare vertical room, and be squeezed below it (
      // clipping the fixed-height cards) wherever there is not.
      style={styles.rail}
      contentContainerStyle={styles.scrollContainer}
      decelerationRate="fast"
      // Cards are uniform width, so one interval says what a per-render offsets
      // array said — and matches how `ArticleRail` snaps, so the two rails on
      // Explore behave identically.
      snapToInterval={CARD_WIDTH + CARD_SPACING}
      snapToAlignment="start"
    >
      {displayArticles.map(article => (
        <View key={`featured-${article.id}`} style={styles.cardContainer}>
          <ArticleCard
            article={article}
            {...buildArticleCardProps(article)}
            elevation="hairline"
            style={SLIDER_CARD_STYLE}
            testID={`slider-article-${article.id}`}
            isFeaturedArticle={true}
          />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rail: {
    flexGrow: 0,
    flexShrink: 0,
  },
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
