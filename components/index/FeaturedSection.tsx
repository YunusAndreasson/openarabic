import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

import { LAYOUT } from '../../constants/layout';
import ThemedCard from '../ThemedCard';
import SectionTitle from '../SectionTitle';

interface FeaturedSectionProps {
  article: Article;
  onPress: (article: Article) => void;
  showTitle?: boolean;
}

/**
 * A section displaying the featured article
 */
const FeaturedSection: React.FC<FeaturedSectionProps> = ({
  article,
  onPress,
  showTitle = true,
}) => {
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
      {showTitle && <SectionTitle title="Featured" isFirstSection={true} />}
      <ThemedCard
        variant="article"
        imageUrl={article.image_url || 'https://picsum.photos/800/400'}
        title={article.title}
        category={article.category?.name || ''}
        author={article.author?.name || 'Unknown'}
        summary={article.summary || undefined}
        onPress={handlePress}
        style={styles.cardStyle}
        fullSummary={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardStyle: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    shadowOpacity: LAYOUT.OPACITY.LIGHT, // Slightly increased shadow for emphasis
  },
  container: {
    // Remove custom spacing - SectionTitle handles all section spacing
  },
});

FeaturedSection.displayName = 'FeaturedSection';

export default FeaturedSection;
