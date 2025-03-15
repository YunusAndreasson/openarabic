import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import { useFadeInAnimation } from '../hooks/animations';
import SectionTitle from './SectionTitle';
import ThemedCard from './ThemedCard';

interface FeaturedArticleItemProps {
  article: Article;
  index: number;
  totalCount: number;
  onPress: (article: Article) => void;
}

/**
 * Individual featured article item with animation
 */
const FeaturedArticleItem = React.memo(
  ({ article, index, totalCount, onPress }: FeaturedArticleItemProps) => {
    // Use animation with staggered delay based on index
    const { animatedStyle, startAnimation } = useFadeInAnimation(
      300 + index * 100,
      LAYOUT.ANIMATION.DURATION.NORMAL
    );

    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <Animated.View
        style={[index < totalCount - 1 ? styles.itemMargin : undefined, animatedStyle]}
      >
        <ThemedCard
          imageUrl={article.image_url || ''}
          title={article.title}
          category={article.category?.name || 'Uncategorized'}
          author={article.author?.name || 'Anonymous'}
          summary={article.summary || undefined}
          onPress={() => onPress(article)}
          style={styles.card}
        />
      </Animated.View>
    );
  }
);

interface FeaturedArticleSectionProps {
  /**
   * Title for the section
   */
  title: string;

  /**
   * Array of featured articles to display
   */
  articles: Article[];

  /**
   * Callback when an article is pressed
   */
  onArticlePress: (article: Article) => void;

  /**
   * Animation delay in milliseconds
   */
  delay?: number;
}

/**
 * A section displaying featured articles in a vertical stack
 */
const FeaturedArticleSection = React.memo(
  ({ title, articles, onArticlePress, delay = 300 }: FeaturedArticleSectionProps) => {
    // Use section animation
    const { animatedStyle, startAnimation } = useFadeInAnimation(
      delay,
      LAYOUT.ANIMATION.DURATION.NORMAL
    );

    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    // Skip rendering if no articles
    if (!articles || articles.length === 0) return null;

    return (
      <Animated.View style={[styles.section, animatedStyle]}>
        <SectionTitle title={title} />
        <View style={styles.contentContainer}>
          {articles.map((article, index) => (
            <FeaturedArticleItem
              key={`featured-${article.id}`}
              article={article}
              index={index}
              totalCount={articles.length}
              onPress={onArticlePress}
            />
          ))}
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  section: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  itemMargin: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    width: '100%',
  },
});

FeaturedArticleSection.displayName = 'FeaturedArticleSection';
FeaturedArticleItem.displayName = 'FeaturedArticleItem';

export default FeaturedArticleSection;
