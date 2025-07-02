import { memo, useCallback, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import ArticleCard from '@/components/ArticleCard';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';

interface FeaturedSectionProps {
  article: Article;
  onPress: (article: Article) => void;
}

/**
 * A section displaying the featured article
 */
const FeaturedSection: FC<FeaturedSectionProps> = ({ article, onPress }) => {
  // No need for prefetching here - it's done during app preload

  const handlePress = useCallback(() => {
    onPress(article);
  }, [article, onPress]);

  // Articles are guaranteed to be available when this component is used
  return (
    <View style={styles.container}>
      <ArticleCard
        author={article.author.name}
        category={STRINGS.RECOMMENDED}
        categoryForDisplay={article.category.name}
        imageUrl={String(article.image_url)}
        style={styles.cardStyle}
        summary={String(article.summary)}
        title={article.title}
        onPress={handlePress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardStyle: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    shadowOpacity: LAYOUT.OPACITY.SUBTLE,
  },
  container: {},
});

FeaturedSection.displayName = 'FeaturedSection';

export default memo(FeaturedSection);
