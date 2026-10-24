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
import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { getArticleRoute } from '@/utils/routeBuilders';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleProgressPercentage, type ReadingProgressLookup } from '@/utils/progressUtils';
import {
  getArticleMetadataWithoutAuthor,
  getArticleMetadataWithoutCategory,
  getAuthorDisplayName,
  getCategoryDisplayName,
} from '@/utils/stringUtils';

interface RelatedArticlesByFilterProps {
  /** Which list this is — it decides the heading, and what the subtitles leave out */
  filterType: 'author' | 'category';
  /** The author or category name the heading names */
  filterName: string;
  /** Chosen by `useRelatedArticles` */
  articles: Article[];
  progressMap: ReadingProgressLookup;
}

/**
 * The subtitle under a related card, minus whatever the heading already says.
 * Every card used to carry "Author · Category · N min", so under "More from
 * Ibn Kathīr" each one repeated "Ibn Kathīr", and under "More in Tafsīr" each
 * one repeated "Tafsīr".
 */
const getSubtitle = (article: Article, filterType: 'author' | 'category') =>
  filterType === 'author'
    ? getArticleMetadataWithoutAuthor(article)
    : getArticleMetadataWithoutCategory(article);

/**
 * One "More from …" list at the foot of the reader: a heading and its cards.
 * Which texts, and in which list, is `useRelatedArticles`' decision.
 */
export const RelatedArticlesByFilter = memo<RelatedArticlesByFilterProps>(
  ({ filterType, filterName, articles, progressMap }) => {
    const router = useRouter();

    // Push the next article, exactly like every other article link in the app.
    //
    // This used to call router.back() and then push 100ms later, on the premise
    // that the reader is a modal that has to be dismissed first. It is not —
    // article/[id] is a plain pushed screen (app/_layout.tsx), so that popped
    // the reader back to Explore and then raced a push into the middle of the
    // pop animation, with an uncancelled timer left to fire after unmount.
    const handleArticlePress = useCallback(
      (articleId: ArticleId, _title: string) => {
        router.push(getArticleRoute(articleId));
      },
      [router],
    );

    // Memoize the article cards to prevent unnecessary re-renders
    const articleCards = useMemo(() => {
      return articles.map((article, index) => {
        const progressPercentage = getArticleProgressPercentage(progressMap, article.id);

        return (
          <View key={article.id} style={index > 0 ? styles.articleSpacing : undefined}>
            <PlaylistItemCard
              title={article.title}
              secondaryText={getSubtitle(article, filterType)}
              imageUrl={generateStorageUrl('images', article.image_url)}
              articleId={article.id}
              progressPercentage={progressPercentage}
              onPress={() => handleArticlePress(article.id, article.title)}
              PressableComponent={Pressable}
            />
          </View>
        );
      });
    }, [articles, progressMap, filterType, handleArticlePress]);

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
    if (articles.length === 0) {
      return null;
    }

    return (
      <View>
        <SectionLabel density="compact" title={sectionTitle} />
        <View style={styles.cards}>{articleCards}</View>
      </View>
    );
  },
);

RelatedArticlesByFilter.displayName = 'RelatedArticlesByFilter';

const styles = StyleSheet.create({
  // The label brings its own screen inset and top spacing. These used to sit
  // inside two padded wrappers, which put the cards 16pt in and the label 28pt
  // in under an article whose text starts at 12.
  cards: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  articleSpacing: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
