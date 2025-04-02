import React from 'react';
import { StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { LAYOUT } from '../../constants/layout';
import ThemedCard from '../ThemedCard';
import Section from '../Section';
import { DailyPickSectionProps } from '@/types/ui/layout.types';
import { articlesService } from '@/services/articles';

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
  const handlePress = React.useCallback(() => {
    if (!article) return;

    // Always prefetch article data with no caching
    queryClient.prefetchQuery({
      queryKey: ['article', article.id],
      queryFn: () => articlesService.getArticleById(article.id),
      staleTime: 0, // No caching
      gcTime: 0, // No cache retention
    });

    // Call the original onPress handler
    onPress(article);
  }, [article, onPress, queryClient]);

  // Daily pick should be pre-loaded at startup since it's important
  // This ensures it's ready when the user sees it
  React.useEffect(() => {
    if (article) {
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
        staleTime: 0, // No caching
        gcTime: 0, // No cache retention
      });
    }
  }, [article, queryClient]);

  // Skip rendering if no article
  if (!article) return null;

  return (
    <Section
      title={showTitle ? 'Daily Pick' : undefined}
      style={styles.container}
      showTitle={true}
      paddingHorizontal={true}
    >
      <ThemedCard
        variant="article"
        imageUrl={article.image_url || 'https://picsum.photos/800/400'}
        title={article.title}
        category={article.category?.name || 'General'}
        author={article.author?.name || 'Unknown'}
        summary={article.summary || undefined}
        onPress={handlePress}
      />
    </Section>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL, // Reduced from LARGE to SMALL
  },
});

DailyPickSection.displayName = 'DailyPickSection';

export default DailyPickSection;
