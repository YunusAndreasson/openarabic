import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import ThemedCard from './ThemedCard';
import AnimatedSection from './AnimatedSection';
import { DailyPickSectionProps } from '@/types/ui.types';
import { articlesService } from '@/services/articles';

/**
 * A section displaying the daily pick article
 */
const DailyPickSection = React.memo(({ article, onPress, delay = 0 }: DailyPickSectionProps) => {
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
      title="Daily Pick"
      delay={delay}
      duration={LAYOUT.ANIMATION.DURATION.SLOW}
      style={styles.section}
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
});

const styles = StyleSheet.create({
  section: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});

DailyPickSection.displayName = 'DailyPickSection';

export default DailyPickSection;
