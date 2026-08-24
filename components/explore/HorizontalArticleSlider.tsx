import { memo, type FC } from 'react';

import { SnapRail } from '@/components/common';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { MAX_FEATURED_ARTICLES } from '@/hooks/articles/useMultipleFeaturedArticles';

import { ArticleCard } from './ArticleCard';
import type { Article } from '@/types/articles.types';
import { buildArticleCardProps } from '@/utils/articleUtils';

interface HorizontalArticleSliderProps {
  articles: Article[];
}

// Calculate card width based on screen width and spacing. The gap between cards
// and the snap interval come from `SnapRail`, which owns both.
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
    <SnapRail itemWidth={CARD_WIDTH} itemHeight={CARD_HEIGHT}>
      {displayArticles.map(article => (
        <ArticleCard
          key={`featured-${article.id}`}
          article={article}
          {...buildArticleCardProps(article)}
          elevation="hairline"
          style={SLIDER_CARD_STYLE}
          testID={`slider-article-${article.id}`}
          isFeaturedArticle={true}
        />
      ))}
    </SnapRail>
  );
};

export const HorizontalArticleSlider = memo(HorizontalArticleSliderComponent);
HorizontalArticleSlider.displayName = 'HorizontalArticleSlider';
