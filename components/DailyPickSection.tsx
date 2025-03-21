import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { LAYOUT } from '../constants/layout';
import ThemedCard from './ThemedCard';
import { AnimatedSection } from './index';
import { DailyPickSectionProps } from '@/types/ui.types';
import { articlesService } from '@/services/articles';

/**
 * A section displaying the daily pick article
 */
const DailyPickSection: React.FC<DailyPickSectionProps> = ({
  article,
  onPress,
  delay = 0,
  showTitle = true,
}) => {
  // Use queryClient for prefetching
  const queryClient = useQueryClient();

  // Handle the press with prefetching
  const handleArticlePress = useCallback(() => {
    if (!article) return;

    // Prefetch article data
    queryClient.prefetchQuery({
      queryKey: ['article', article.id],
      queryFn: () => articlesService.getArticleById(article.id),
    });

    // Call the original onPress handler
    onPress(article);
  }, [article, onPress, queryClient]);

  // Skip rendering if no article
  if (!article) return null;

  return (
    <AnimatedSection
      title={showTitle ? 'Daily Pick' : undefined}
      delay={delay}
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
    </AnimatedSection>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});

DailyPickSection.displayName = 'DailyPickSection';

export default DailyPickSection;
