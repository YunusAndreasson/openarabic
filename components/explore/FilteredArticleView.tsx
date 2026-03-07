import { ListSeparator, SectionLabel } from '@/components/common';
import { FlashList } from '@shopify/flash-list';
import { type FC, type JSX, useDeferredValue, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { PlaylistItemCard } from '@/components/playlist';
import { PulsatingLoader } from '@/components/ui';
import {
  LIST_DRAW_DISTANCE_MULTIPLIER,
  SCROLL_EVENT_THROTTLE,
  TIMING_CONFIG,
} from '@/constants/animation';
import { COMPLETION_THRESHOLD, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import type { Article } from '@/types/articles.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { calculateReadingTime } from '@/utils/stringUtils';

// List item types
interface SectionHeaderItem {
  type: 'header';
  id: string;
  title: string;
}

interface ArticleItem {
  type: 'article';
  id: string;
  data: Article;
}

type ListItem = SectionHeaderItem | ArticleItem;

const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM;

const SeparatorComponent = () => <ListSeparator height={LAYOUT.SPACING.SMALL} />;

const STATIC_STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  footerSpacer: {
    height: LAYOUT.SPACING.LARGE,
  },
});

const FooterComponent = () => <View style={STATIC_STYLES.footerSpacer} />;

/**
 * Groups articles by progress state and flattens them with section headers
 */
function groupArticlesWithHeaders(
  articles: Article[],
  progressMap: Map<number, { last_sentence_read: number; total_sentences: number }>,
): ListItem[] {
  if (articles.length === 0) return [];

  // Group articles by progress state
  const continueReading: Article[] = [];
  const unread: Article[] = [];
  const completed: Article[] = [];

  articles.forEach(article => {
    const progressData = progressMap.get(article.id);
    const progress = progressData
      ? calculateProgressPercentage(progressData.last_sentence_read, progressData.total_sentences)
      : 0;
    if (progress > 0 && progress < COMPLETION_THRESHOLD) {
      continueReading.push(article);
    } else if (progress >= COMPLETION_THRESHOLD) {
      completed.push(article);
    } else {
      unread.push(article);
    }
  });

  // Flatten into list items with headers
  const listItems: ListItem[] = [];

  if (continueReading.length > 0) {
    listItems.push({ type: 'header', id: 'header-continue', title: STRINGS.CONTINUE_READING });
    continueReading.forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  if (unread.length > 0) {
    listItems.push({ type: 'header', id: 'header-unread', title: STRINGS.UNREAD });
    unread.forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  if (completed.length > 0) {
    listItems.push({ type: 'header', id: 'header-completed', title: STRINGS.COMPLETED });
    completed.forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  return listItems;
}

interface FilteredArticleViewProps {
  articles: Article[];
  onArticlePress?: (article: Article) => void;
}

/**
 * A specialized component for displaying filtered articles
 */
export const FilteredArticleView: FC<FilteredArticleViewProps> = ({
  articles,
  onArticlePress,
}) => {
  const insets = useSafeAreaInsets();

  const {
    articles: visibleArticles,
    progressMap,
    isProgressLoading,
  } = useFilteredArticles(articles);

  // React 19: Defer article grouping to keep scrolling smooth during re-sorts
  const deferredVisibleArticles = useDeferredValue(visibleArticles);

  const listData = useMemo(
    () => groupArticlesWithHeaders(deferredVisibleArticles, progressMap),
    [deferredVisibleArticles, progressMap],
  );

  const listContentStyle = useMemo(
    () => ({
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: LAYOUT.SCREEN_PADDING.bottomDefault + insets.bottom,
      paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    }),
    [insets.bottom],
  );

  const themedViewProps = {
    includeBottomInset: false,
    safeAreaEdges: ['left', 'right'] as ('left' | 'right' | 'bottom' | 'top')[],
    style: STATIC_STYLES.container,
  };

  const shouldShowLoading =
    isProgressLoading && visibleArticles.length > 0 && progressMap.size === 0;

  if (shouldShowLoading) {
    return (
      <ThemedView {...themedViewProps}>
        <View style={[STATIC_STYLES.emptyContainer, { paddingTop: LAYOUT.SPACING.XXLARGE }]}>
          <PulsatingLoader size={64} />
        </View>
      </ThemedView>
    );
  }

  const renderItem = ({ item }: { item: ListItem }): JSX.Element => {
    if (item.type === 'header') {
      return <SectionLabel title={item.title} />;
    }

    const article = item.data;
    const progress = progressMap.get(article.id);
    const progressPercentage = progress
      ? calculateProgressPercentage(progress.last_sentence_read, progress.total_sentences)
      : 0;

    const readingTime = calculateReadingTime(article.article_sentences.length);
    const secondaryText = `${article.author.name} · ${readingTime}`;

    return (
      <Animated.View
        entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
        exiting={FadeOut.duration(TIMING_CONFIG.FAST.duration)}
      >
        <PlaylistItemCard
          title={article.title}
          secondaryText={secondaryText}
          imageUrl={generateStorageUrl('images', article.image_url)}
          articleId={article.id}
          onPress={onArticlePress ? () => onArticlePress(article) : undefined}
          progressPercentage={progressPercentage}
        />
      </Animated.View>
    );
  };

  return (
    <ThemedView {...themedViewProps}>
      <FlashList<ListItem>
        data={listData}
        drawDistance={ITEM_HEIGHT * LIST_DRAW_DISTANCE_MULTIPLIER}
        keyExtractor={(item: ListItem) => item.id}
        removeClippedSubviews={true}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={listContentStyle}
        ItemSeparatorComponent={SeparatorComponent}
        ListFooterComponent={FooterComponent}
        renderItem={renderItem}
        getItemType={(item: ListItem) => item.type}
      />
    </ThemedView>
  );
};

FilteredArticleView.displayName = 'FilteredArticleView';
