import { memo } from 'react';
import { useWindowDimensions } from 'react-native';

import { SnapRail } from '@/components/common';
import type { ArticleRailItem } from '@/hooks/explore/useExploreRails';
import type { Article } from '@/types/articles.types';

import { ArticleRow } from './ArticleRow';

const CARD_WIDTH_RATIO = 0.7;

interface ArticleRailProps {
  items: ArticleRailItem[];
  /** Namespaces card keys by rail */
  keyPrefix: string;
  onArticlePress: (article: Article) => void;
}

/**
 * Horizontal snap rail of compact article cards — the shared building block for
 * "Continue Reading" / "Getting Started" and the discovery sections on Explore.
 * Full-bleed: cards scroll under the screen edges while the resting position
 * keeps the first card on the standard screen padding, flush with the section
 * label above it.
 */
const ArticleRailComponent = ({ items, keyPrefix, onArticlePress }: ArticleRailProps) => {
  const { width } = useWindowDimensions();

  return (
    <SnapRail itemWidth={width * CARD_WIDTH_RATIO}>
      {items.map(({ article, progress }) => (
        <ArticleRow
          key={`${keyPrefix}-${article.id}`}
          article={article}
          progressPercentage={progress}
          onPress={onArticlePress}
          compact
        />
      ))}
    </SnapRail>
  );
};

export const ArticleRail = memo(ArticleRailComponent);
ArticleRail.displayName = 'ArticleRail';
