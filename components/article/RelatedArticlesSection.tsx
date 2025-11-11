import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ListenListItemCard } from '@/components/bookmarks';
import { LAYOUT } from '@/constants/layout';
import { useMultipleFeaturedArticles } from '@/hooks/articles/useMultipleFeaturedArticles';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

interface RelatedArticlesSectionProps {
  /**
   * The current article ID to exclude from recommendations
   */
  currentArticleId: number;

  /**
   * The articles data to select from
   */
  articlesData: Article[];

  /**
   * The current article being viewed (for author/category comparison)
   */
  currentArticle: Article;

  /**
   * Maximum number of related articles to show (default: 5)
   */
  maxArticles?: number;

  /**
   * Callback fired when related articles section becomes visible
   * Used as heuristic to mark article as 100% complete
   */
  onVisible?: () => void;
}

// Section header component matching FilteredArticleView style
const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <ThemedText type="heading3" weight="bold">
      {title}
    </ThemedText>
  </View>
);

/**
 * Determines the appropriate section heading based on article similarity
 * Prioritizes showing author or category context over generic heading
 */
function determineHeading(
  currentArticle: Article,
  relatedArticles: Article[],
): { text: string; type: 'author' | 'category' | 'general' } {
  if (relatedArticles.length === 0) {
    return { text: 'Related Articles', type: 'general' };
  }

  const currentAuthorId = currentArticle.author.id;
  const currentCategoryId = currentArticle.category.id;

  // Count articles from same author and same category
  let sameAuthorCount = 0;
  let sameCategoryCount = 0;

  relatedArticles.forEach(article => {
    if (article.author.id === currentAuthorId) sameAuthorCount++;
    if (article.category.id === currentCategoryId) sameCategoryCount++;
  });

  // Prioritize author if there are more author matches than category matches
  if (sameAuthorCount > sameCategoryCount && sameAuthorCount > 0) {
    return {
      text: `More from ${currentArticle.author.name}`,
      type: 'author',
    };
  }

  // Show category if there are any category matches
  if (sameCategoryCount > 0) {
    return {
      text: `More in ${capitalizeFirstLetter(currentArticle.category.name)}`,
      type: 'category',
    };
  }

  // Fallback to general heading only if no matches at all
  return { text: 'Related Articles', type: 'general' };
}

/**
 * Related Articles Section Component
 *
 * Displays intelligently selected related articles at the end of article content.
 * Shows only unread or low-progress articles (< 20%) to always offer fresh content.
 * Uses existing article selection logic for consistency and efficiency.
 */
export const RelatedArticlesSection = memo<RelatedArticlesSectionProps>(
  ({ currentArticleId, articlesData, currentArticle, maxArticles = 5, onVisible }) => {
    const router = useRouter();

    // Filter out current article efficiently with memoization
    const filteredArticles = useMemo(() => {
      return articlesData.filter(article => article.id !== currentArticleId);
    }, [articlesData, currentArticleId]);

    // Use existing intelligent selection logic for consistency
    const { articles: selectedArticles } = useMultipleFeaturedArticles(
      filteredArticles,
      0, // No refresh for stability in article context
      `article-${currentArticleId}`, // Unique scope per article for cache consistency
    );

    // Fetch bulk reading progress for selected articles
    const selectedArticleIds = useMemo(() => selectedArticles.map(a => a.id), [selectedArticles]);
    const { data: progressMap } = useSafeBulkReadingProgress(selectedArticleIds);

    // Filter to only show unread or low-progress articles (< 20%)
    const unreadOrLowProgressArticles = useMemo(() => {
      if (!selectedArticles.length) return selectedArticles;
      return selectedArticles.filter(article => {
        const progress = progressMap?.get?.(article.id);

        // Include if unread (no progress entry)
        if (!progress) return true;

        // Include if low progress (< 20%)
        const progressPercentage = calculateProgressPercentage(
          progress.last_sentence_read,
          progress.total_sentences,
        );
        return progressPercentage < 20;
      });
    }, [selectedArticles, progressMap]);

    // Limit to requested number of unread/low-progress articles
    const relatedArticles = useMemo(() => {
      return unreadOrLowProgressArticles.slice(0, maxArticles);
    }, [unreadOrLowProgressArticles, maxArticles]);

    // Determine the section heading based on article similarity
    const heading = useMemo(() => {
      return determineHeading(currentArticle, relatedArticles);
    }, [currentArticle, relatedArticles]);

    // Navigation handler - dismiss current modal then push new one
    // This ensures clean modal transitions without state synchronization issues
    const handleArticlePress = useCallback(
      (articleId: number, title: string) => {
        // Dismiss current article modal
        router.back();

        // Wait for dismiss animation to start, then push new article
        // This prevents modal stacking while giving smooth transition
        setTimeout(() => {
          router.push({
            pathname: '/article/[id]',
            params: {
              id: articleId.toString(),
              headerTitle: title,
            },
          });
        }, 100); // Brief delay for dismiss animation to start
      },
      [router],
    );

    // Memoize the article cards to prevent unnecessary re-renders
    const articleCards = useMemo(() => {
      return relatedArticles.map((article, index) => {
        const progress = progressMap?.get?.(article.id);
        const progressPercentage = progress
          ? calculateProgressPercentage(progress.last_sentence_read, progress.total_sentences)
          : 0;

        return (
          <View key={article.id} style={index > 0 ? styles.articleSpacing : undefined}>
            <ListenListItemCard
              title={article.title}
              secondaryText={capitalizeFirstLetter(article.category.name)}
              imageUrl={generateImageUrl(article.image_url)}
              articleId={article.id}
              progressPercentage={progressPercentage}
              onPress={() => handleArticlePress(article.id, article.title)}
            />
          </View>
        );
      });
    }, [relatedArticles, progressMap, handleArticlePress]);

    // Track if we've already fired the callback
    const hasCalledOnVisibleRef = useRef(false);

    // Fire callback when related articles section becomes visible on screen
    // This serves as a heuristic to mark article as 100% complete
    const handleLayout = useCallback(() => {
      if (!hasCalledOnVisibleRef.current && onVisible) {
        hasCalledOnVisibleRef.current = true;
        onVisible();
      }
    }, [onVisible]);

    // Early return if no articles to show
    if (relatedArticles.length === 0) {
      return null;
    }

    return (
      <View style={styles.container} onLayout={handleLayout}>
        <SectionHeader title={heading.text} />
        {articleCards}
      </View>
    );
  },
);

RelatedArticlesSection.displayName = 'RelatedArticlesSection';

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    // paddingBottom removed - FlashList contentContainerStyle handles bottom spacing
  },
  sectionHeader: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  articleSpacing: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
