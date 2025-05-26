import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

import { LAYOUT } from '../../constants/layout';
import ThemedCard from '../ThemedCard';

interface DailyPickSectionProps {
  article: Article;
  onPress: (article: Article) => void;
  showTitle?: boolean;
}

/**
 * A section displaying the daily pick article
 */
const DailyPickSection: React.FC<DailyPickSectionProps> = ({
  article,
  onPress,
  showTitle = true,
}) => {
  // Use queryClient for prefetching
  const queryClient = useQueryClient();

  // Handle the press with prefetching
  const handlePress = useCallback(() => {
    if (!article) return;

    // Always prefetch article data with no caching
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

  // Daily pick should be pre-loaded at startup since it's important
  // This ensures it's ready when the user sees it
  useEffect(() => {
    if (article) {
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
        staleTime: 0, // No caching
        gcTime: 0, // No cache retention
        retry: 3,
      });
    }
  }, [article, queryClient]);

  // Skip rendering if no article
  if (!article) return null;

  return (
    <View style={styles.container}>
      <ThemedCard
        variant="article"
        imageUrl={article.image_url || 'https://picsum.photos/800/400'}
        title={article.title}
        category="Just for you"
        author={article.author ? article.author.name : 'Unknown'}
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
    marginBottom: LAYOUT.SPACING.XLARGE,
    marginTop: 0,
  },
});

DailyPickSection.displayName = 'DailyPickSection';

export default DailyPickSection;
