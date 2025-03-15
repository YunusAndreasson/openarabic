import React from 'react';
import { StyleSheet } from 'react-native';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import ThemedCard from './ThemedCard';
import AnimatedSection from './AnimatedSection';
import { DailyPickSectionProps } from '@/types/ui.types';

/**
 * A section displaying the daily pick article
 */
const DailyPickSection = React.memo(({ article, onPress, delay = 0 }: DailyPickSectionProps) => {
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
        onPress={() => onPress(article)}
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
