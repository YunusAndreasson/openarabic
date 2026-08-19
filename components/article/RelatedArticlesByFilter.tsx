import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
// Gesture-handler Pressable, NOT react-native's. The article screen wraps its
// whole content in an RNGH Pressable (see app/article/[id].tsx) to dismiss the
// word tooltip on a background tap, and these rows render inside it as the
// list footer. An RNGH ancestor wins the gesture arena against descendants
// that use the JS responder system, so every related-article card silently
// stopped responding to taps — the same failure the floating action buttons
// and the tutorial close button already hit.
import { Pressable } from 'react-native-gesture-handler';

import { SectionLabel } from '@/components/common';
import { PlaylistItemCard } from '@/components/playlist';
import { LAYOUT } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMultipleFeaturedArticles } from '@/hooks/articles/useMultipleFeaturedArticles';
import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { deduplicateArticlesByImage } from '@/utils/articleUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import {
  getArticleMetadata,
  getAuthorDisplayName,
  getCategoryDisplayName,
} from '@/utils/stringUtils';

interface RelatedArticlesByFilterProps {
  /**
   * The current article ID to exclude from recommendations
   */
  currentArticleId: number;

  /**
   * The articles data to select from
   */
  articlesData: Article[];

  /**
   * Filter type: 'author' or 'category'
   */
  filterType: 'author' | 'category';

  /**
   * The ID to filter by (author_id or category_id)
   */
  filterId: number;

  /**
   * The name to display in the section title (author name or category name)
   */
  filterName: string;

  /**
   * Maximum number of related articles to show (default: 5)
   */
  maxArticles?: number;
}

/**
 * Related Articles By Filter Component
 *
 * Displays intelligently selected related articles filtered by author or category.
 * Shows only unread or low-progress articles (< 20%) to always offer fresh content.
 * Uses existing article selection logic for consistency and efficiency.
 */
export const RelatedArticlesByFilter = memo<RelatedArticlesByFilterProps>(
  ({ currentArticleId, articlesData, filterType, filterId, filterName, maxArticles = 5 }) => {
    const router = useRouter();

    // Filter articles by author or category, excluding current article
    // Optimized: use early return pattern and single filter condition
    const filteredArticles = useMemo(() => {
      if (!articlesData.length) return [];

      // Use single filter with optimized condition based on filterType
      if (filterType === 'author') {
        return articlesData.filter(
          article => article.id !== currentArticleId && article.author_id === filterId,
        );
      }
      return articlesData.filter(
        article => article.id !== currentArticleId && article.category_id === filterId,
      );
    }, [articlesData, currentArticleId, filterType, filterId]);

    // Use existing intelligent selection logic for consistency
    const { articles: selectedArticles } = useMultipleFeaturedArticles(
      filteredArticles,
      0, // No refresh for stability in article context
      `article-${currentArticleId}-${filterType}-${filterId}`, // Unique scope per filter for cache consistency
    );

    // Fetch bulk reading progress for selected articles
    const selectedArticleIds = useMemo(() => selectedArticles.map(a => a.id), [selectedArticles]);
    const { data: progressMap } = useBulkReadingProgress(selectedArticleIds);

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

    // Limit to requested number of unread/low-progress articles, deduplicating by image
    const relatedArticles = useMemo(() => {
      return deduplicateArticlesByImage(unreadOrLowProgressArticles).slice(0, maxArticles);
    }, [unreadOrLowProgressArticles, maxArticles]);

    // Push the next article, exactly like every other article link in the app.
    //
    // This used to call router.back() and then push 100ms later, on the premise
    // that the reader is a modal that has to be dismissed first. It is not —
    // article/[id] is a plain pushed screen (app/_layout.tsx), so that popped
    // the reader back to Explore and then raced a push into the middle of the
    // pop animation, with an uncancelled timer left to fire after unmount.
    const handleArticlePress = useCallback(
      (articleId: ArticleId, title: string) => {
        router.push(getArticleRoute(articleId, title));
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
            <PlaylistItemCard
              title={article.title}
              secondaryText={getArticleMetadata(article)}
              imageUrl={generateStorageUrl('images', article.image_url)}
              articleId={article.id}
              progressPercentage={progressPercentage}
              onPress={() => handleArticlePress(article.id, article.title)}
              PressableComponent={Pressable}
            />
          </View>
        );
      });
    }, [relatedArticles, progressMap, handleArticlePress]);

    // Format section title based on filter type
    // Capitalize category name for consistency with rest of app
    // Must be called before early return to satisfy React Hooks rules
    const sectionTitle = useMemo(() => {
      if (filterType === 'author') {
        return STRINGS.MORE_FROM_AUTHOR.replace('{author}', getAuthorDisplayName(filterName));
      }
      return STRINGS.MORE_FROM_CATEGORY.replace('{category}', getCategoryDisplayName(filterName));
    }, [filterType, filterName]);

    // Early return if no articles to show
    if (relatedArticles.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <SectionLabel density="compact" title={sectionTitle} />
        {articleCards}
      </View>
    );
  },
);

RelatedArticlesByFilter.displayName = 'RelatedArticlesByFilter';

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    // paddingBottom removed - FlashList contentContainerStyle handles bottom spacing
  },
  articleSpacing: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
