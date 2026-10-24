import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

// These rows are the reader's list footer, inside its tap detector, where a
// react-native Pressable takes no taps at all — see ReaderPressable.
import { ReaderPressable } from '@/components/article/ReaderPressable';
import { SectionLabel } from '@/components/common';
import { ArticleRow } from '@/components/explore/ArticleRow';
import { LAYOUT } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';
import { getArticleProgressPercentage, type ReadingProgressLookup } from '@/utils/progressUtils';
import { fillTemplate } from '@/utils/fillTemplate';
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
      (article: Article) => {
        router.push(getArticleRoute(article.id, article.title));
      },
      [router],
    );

    // Memoize the article cards to prevent unnecessary re-renders
    const articleCards = useMemo(() => {
      return articles.map((article, index) => (
        <View key={article.id} style={index > 0 ? styles.articleSpacing : undefined}>
          <ArticleRow
            article={article}
            secondaryText={getSubtitle(article, filterType)}
            progressPercentage={getArticleProgressPercentage(progressMap, article.id)}
            onPress={handleArticlePress}
            PressableComponent={ReaderPressable}
          />
        </View>
      ));
    }, [articles, progressMap, filterType, handleArticlePress]);

    // Format section title based on filter type
    // Capitalize category name for consistency with rest of app
    // Must be called before early return to satisfy React Hooks rules
    const sectionTitle = useMemo(() => {
      if (filterType === 'author') {
        return fillTemplate(STRINGS.MORE_FROM_AUTHOR, {
          author: getAuthorDisplayName(filterName),
        });
      }
      return fillTemplate(STRINGS.MORE_FROM_CATEGORY, {
        category: getCategoryDisplayName(filterName),
      });
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
