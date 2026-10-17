import { memo } from 'react';
import { useWindowDimensions } from 'react-native';

import { SnapRail } from '@/components/common';
import { PlaylistItemCard } from '@/components/playlist/PlaylistItemCard';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import type { Article } from '@/types/articles.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

const CARD_WIDTH_RATIO = 0.7;

export interface ArticleRailItem {
  article: Article;
  /** Reading progress 0-100 — rendered as the card's bottom progress bar */
  progress?: number;
}

interface ArticleRailProps {
  items: ArticleRailItem[];
  /** Namespaces card keys so the same article can appear in multiple rails */
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
  const prefetchArticle = useArticlePrefetch();
  const { width } = useWindowDimensions();

  return (
    <SnapRail itemWidth={width * CARD_WIDTH_RATIO}>
      {items.map(({ article, progress }) => (
        <PlaylistItemCard
          key={`${keyPrefix}-${article.id}`}
          title={article.title}
          secondaryText={getArticleMetadataWithoutCategory(article)}
          imageUrl={generateStorageUrl('images', article.image_url)}
          articleId={article.id}
          progressPercentage={progress}
          onPress={() => onArticlePress(article)}
          onPressIn={() => prefetchArticle(article.id)}
          compact
        />
      ))}
    </SnapRail>
  );
};

export const ArticleRail = memo(ArticleRailComponent);
ArticleRail.displayName = 'ArticleRail';
