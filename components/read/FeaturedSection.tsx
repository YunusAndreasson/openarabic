import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import ArticleCard from '@read/ArticleCard';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';

interface FeaturedSectionProps {
  article: Article;
}

/**
 * A section displaying the featured article
 */
const FeaturedSection: FC<FeaturedSectionProps> = ({ article }) => {
  // No need for prefetching here - it's done during app preload
  // Note: Navigation is now handled by Link component in ArticleCard

  // Articles are guaranteed to be available when this component is used
  return (
    <View style={styles.container}>
      <ArticleCard
        article={article}
        author={article.author.name}
        category={STRINGS.RECOMMENDED}
        categoryForDisplay={article.category.name}
        imageUrl={generateImageUrl(article.image_url)}
        style={styles.cardStyle}
        summary={String(article.summary)}
        title={article.title}
        prefetch={true}
        isRelatedArticle={false}
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

FeaturedSection.displayName = 'FeaturedSection';

export default memo(FeaturedSection);
