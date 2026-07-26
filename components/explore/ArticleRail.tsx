import { memo, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PlaylistItemCard } from '@/components/playlist/PlaylistItemCard';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import type { Article } from '@/types/articles.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_SPACING = LAYOUT.SPACING.SMALL;

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
const ArticleRailComponent: FC<ArticleRailProps> = ({ items, keyPrefix, onArticlePress }) => {
  const prefetchArticle = useArticlePrefetch();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + CARD_SPACING}
      snapToAlignment="start"
    >
      {items.map(({ article, progress }) => (
        <View key={`${keyPrefix}-${article.id}`} style={styles.cardContainer}>
          <PlaylistItemCard
            title={article.title}
            secondaryText={getArticleMetadataWithoutCategory(article)}
            imageUrl={generateStorageUrl('images', article.image_url)}
            articleId={article.id}
            progressPercentage={progress}
            onPress={() => onArticlePress(article)}
            onPressIn={() => prefetchArticle(article.id)}
            compact
          />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    gap: CARD_SPACING,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
});

export const ArticleRail = memo(ArticleRailComponent);
ArticleRail.displayName = 'ArticleRail';
