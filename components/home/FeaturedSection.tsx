import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

import { LAYOUT } from '../../constants/layout';
import SectionTitle from '../SectionTitle';
import ThemedCard from '../ThemedCard';

interface FeaturedSectionProps {
  article: Article;
  onPress: (article: Article) => void;
  showTitle?: boolean;
  dueWordCount?: number;
}

/**
 * A section displaying the featured article
 */
const FeaturedSection: React.FC<FeaturedSectionProps> = ({
  article,
  onPress,
  showTitle = true,
  dueWordCount,
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
      {showTitle && <SectionTitle isFirstSection={true} title="Featured" />}
      <ThemedCard
        author={article.author?.name || 'Author'}
        category="RECOMMENDED READING"
        categoryForDisplay={article.category?.name}
        dueWordCount={dueWordCount}
        fullSummary={true}
        imageUrl={article.image_url || 'https://picsum.photos/800/400'}
        style={styles.cardStyle}
        summary={article.summary || undefined}
        title={article.title}
        variant="article"
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
  container: {
    // Remove custom spacing - SectionTitle handles all section spacing
  },
});

FeaturedSection.displayName = 'FeaturedSection';

export default FeaturedSection;
