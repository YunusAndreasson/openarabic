import { EmptyState, ListSeparator } from '@/components/common';
import { FlashList } from '@shopify/flash-list';
import { type JSX, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/primitives/ThemedText';
import { ThemedView } from '@/components/primitives/ThemedView';
import { PlaylistItemCard } from '@/components/playlist';
import { TextLink } from '@/components/ui';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import type { ArticleSearchResult } from '@/hooks/articles/useArticleSearch';
import type { Article } from '@/types/articles.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // The list's contentContainer already carries the screen inset, so the
  // header's own horizontal padding is zero and it stays flush with the cards.
  listHeader: {
    gap: LAYOUT.SPACING.TINY,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});

const SeparatorComponent = () => <ListSeparator height={LAYOUT.SPACING.SMALL} />;

// Stable at module scope: FlashList v2 re-renders every visible cell when a
// list callback's identity changes.
const keyExtractor = (item: ArticleSearchResult) => `search-${item.article.id}`;

function formatResultCount(count: number): string {
  return count === 1
    ? STRINGS.SEARCH_TEXTS_RESULT_COUNT_ONE
    : STRINGS.SEARCH_TEXTS_RESULT_COUNT_OTHER.replace('{count}', String(count));
}

interface SearchResultListProps {
  results: ArticleSearchResult[];
  /** False until the query is long enough to search — the idle state. */
  hasQuery: boolean;
  isBodyLoading: boolean;
  isBodyError: boolean;
  onRetryBody: () => void;
  onArticlePress: (article: Article) => void;
}

/**
 * The search screen's results.
 *
 * It paints its own background rather than relying on the screen behind it,
 * matching `FilteredArticleView`. Not load-bearing — the screen's own
 * `ThemedView` already covers this area — but a list that owns its background
 * cannot be left translucent by a future reparenting.
 *
 * Everything that is not a result row — the count, and the notice about the
 * sentence corpus — rides INSIDE the list as its header rather than pinned
 * above it. On iOS the screen's `Stack.SearchBar` becomes a UISearchController,
 * and UIKit then lays content out from the top of the window, under the bars,
 * compensating only through the scroll view's own inset. A pinned sibling gets
 * no inset and paints behind the search bar, invisible — the bug that hid the
 * dictionary's sort bar for two releases (commit `b20a0695`).
 */
export const SearchResultList = ({
  results,
  hasQuery,
  isBodyLoading,
  isBodyError,
  onRetryBody,
  onArticlePress,
}: SearchResultListProps) => {
  const insets = useSafeAreaInsets();
  const prefetchArticle = useArticlePrefetch();

  const listContentStyle = useMemo(
    () => ({
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: LAYOUT.SCREEN_PADDING.bottomDefault + insets.bottom,
      paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    }),
    [insets.bottom],
  );

  const renderItem = useCallback(
    ({ item }: { item: ArticleSearchResult }): JSX.Element => {
      const { article, bodySnippet } = item;

      // A body hit says why it is in the list; everything else keeps the
      // catalogue's own subtitle, as the rest of the app shows it.
      const secondaryText = bodySnippet ?? getArticleMetadataWithoutCategory(article);

      return (
        <PlaylistItemCard
          title={article.title}
          secondaryText={secondaryText}
          imageUrl={generateStorageUrl('images', article.image_url)}
          articleId={article.id}
          onPress={() => onArticlePress(article)}
          onPressIn={() => prefetchArticle(article.id)}
        />
      );
    },
    [onArticlePress, prefetchArticle],
  );

  const ListHeaderComponent = useMemo(() => {
    if (!hasQuery || results.length === 0) return null;

    return (
      <View style={styles.listHeader}>
        <ThemedText type="caption" colorName="secondaryText">
          {formatResultCount(results.length)}
        </ThemedText>
        {isBodyError ? (
          <TextLink label={STRINGS.SEARCH_TEXTS_BODY_FAILED} onPress={onRetryBody} />
        ) : (
          isBodyLoading && (
            <ThemedText type="caption" colorName="secondaryText">
              {STRINGS.SEARCH_TEXTS_BODY_LOADING}
            </ThemedText>
          )
        )}
      </View>
    );
  }, [hasQuery, results.length, isBodyLoading, isBodyError, onRetryBody]);

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        {hasQuery ? (
          <EmptyState
            icon="search-outline"
            title={STRINGS.SEARCH_TEXTS_NO_RESULTS_TITLE}
            hint={STRINGS.SEARCH_TEXTS_NO_RESULTS_HINT}
          />
        ) : (
          <EmptyState
            icon="library-outline"
            title={STRINGS.SEARCH_TEXTS_IDLE_TITLE}
            hint={STRINGS.SEARCH_TEXTS_IDLE_HINT}
          />
        )}
      </View>
    ),
    [hasQuery],
  );

  return (
    <ThemedView useSafeArea={false} style={styles.container}>
      <FlashList<ArticleSearchResult>
        data={results}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={SeparatorComponent}
        contentContainerStyle={listContentStyle}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        drawDistance={ITEM_HEIGHT * LIST_DRAW_DISTANCE_MULTIPLIER}
      />
    </ThemedView>
  );
};

SearchResultList.displayName = 'SearchResultList';
