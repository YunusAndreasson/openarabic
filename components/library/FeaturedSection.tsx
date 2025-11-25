import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

import { ArticleCard } from './ArticleCard';
import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';
import { buildArticleCardProps } from '@/utils/articleUtils';

interface FeaturedSectionProps {
  article: Article;
}

/**
 * A section displaying the featured article
 */
const FeaturedSectionComponent: FC<FeaturedSectionProps> = ({ article }) => {
  // No need for prefetching here - it's done during app preload
  // Note: Navigation is now handled by Link component in ArticleCard

  // Articles are guaranteed to be available when this component is used
  return (
    <View style={styles.container}>
      <ArticleCard
        article={article}
        {...buildArticleCardProps(article)}
        pillLabel={STRINGS.RECOMMENDED}
        style={styles.cardStyle}
        prefetch={true}
        isRelatedArticle={false}
        testID="featured-article-card"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardStyle: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  container: {},
});

export const FeaturedSection = memo(FeaturedSectionComponent);
FeaturedSection.displayName = 'FeaturedSection';
