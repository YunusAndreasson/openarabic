import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import ArticleCard from '@/components/ArticleCard';
import { LAYOUT } from '@/constants/layout';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

interface FeaturedSectionProps {
  article: Article;
  onPress: (article: Article) => void;
}

/**
 * A section displaying the featured article
 */
const FeaturedSection: React.FC<FeaturedSectionProps> = ({ article, onPress }) => {
  // Use queryClient for prefetching on press
  const queryClient = useQueryClient();

  // Handle the press with prefetching
  const handlePress = useCallback(() => {
    if (!article) return;

    // Prefetch article data on press for immediate loading
    queryClient.prefetchQuery({
      queryKey: ['article', article.id],
      queryFn: () => articlesService.getArticleById(article.id),
      staleTime: 0, // No caching
      gcTime: 0, // No cache retention
      retry: 3,
    });

    // Call the original onPress handler
    onPress(article);
  }, [article, onPress, queryClient]);

  // Skip rendering if no article
  if (!article) return null;

  return (
    <View style={styles.container}>
      <ArticleCard
        author={article.author?.name || 'Author'}
        category="RECOMMENDED"
        categoryForDisplay={article.category?.name || 'General'}
        imageUrl={article.image_url || 'https://picsum.photos/800/400'}
        style={styles.cardStyle}
        summary={article.summary || 'No summary available'}
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

export default React.memo(FeaturedSection);
