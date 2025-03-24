import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { LAYOUT } from '../constants/layout';
import ThemedCard from './ThemedCard';
import Section from './Section';
import { DailyPickSectionProps } from '@/types/ui.types';
import { articlesService } from '@/services/articles';
import { ARTICLES_STALE_TIME, ARTICLES_GC_TIME } from '@/hooks/useAppPreloader';

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
  const handleArticlePress = useCallback(() => {
    if (!article) return;

    // Check if article is already in cache before prefetching
    const cachedArticle = queryClient.getQueryData(['article', article.id]);
    if (!cachedArticle) {
      // Prefetch article data with longer stale time since articles rarely change
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
        staleTime: ARTICLES_STALE_TIME,
        gcTime: ARTICLES_GC_TIME,
      });
    }

    // Call the original onPress handler
    onPress(article);
  }, [article, onPress, queryClient]);

  // Daily pick should be pre-loaded at startup since it's important
  // This ensures it's ready when the user sees it
  React.useEffect(() => {
    if (article && !queryClient.getQueryData(['article', article.id])) {
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
        staleTime: ARTICLES_STALE_TIME,
        gcTime: ARTICLES_GC_TIME,
      });
    }
  }, [article, queryClient]);

  // Skip rendering if no article
  if (!article) return null;

  return (
    <Section
      title={showTitle ? 'Daily Pick' : undefined}
      style={styles.container}
      paddingHorizontal={true}
    >
      <ThemedCard
        imageUrl={article.image_url || ''}
        title={article.title}
        category={article.category?.name || 'General'}
        author={article.author?.name || 'Unknown'}
        summary={article.summary || undefined}
        onPress={handleArticlePress}
      />
    </Section>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});

DailyPickSection.displayName = 'DailyPickSection';

export default DailyPickSection;
