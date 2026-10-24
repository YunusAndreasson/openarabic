import { EmptyState, LoadingState } from '@/components/common';
import { FlashList } from '@shopify/flash-list';
import { type JSX, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { ThemedView } from '@/components/primitives/ThemedView';
import { TextLink } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { ArticleSearchResult } from '@/hooks/articles/useArticleSearch';
import type { Article } from '@/types/articles.types';
import { formatTextCount } from '@/utils/wordCountText';

import {
  ARTICLE_LIST_DRAW_DISTANCE,
  ArticleRow,
  ArticleRowSeparator,
  useArticleListContentStyle,
} from './ArticleRow';

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

// Stable at module scope: FlashList v2 re-renders every visible cell when a
// list callback's identity changes.
const keyExtractor = (item: ArticleSearchResult) => `search-${item.article.id}`;

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
  const listContentStyle = useArticleListContentStyle();

  // A body hit says why it is in the list; everything else keeps the
  // catalogue's own subtitle, as the rest of the app shows it.
  const renderItem = useCallback(
    ({ item }: { item: ArticleSearchResult }): JSX.Element => (
      <ArticleRow
        article={item.article}
        secondaryText={item.bodySnippet}
        onPress={onArticlePress}
      />
    ),
    [onArticlePress],
  );

  const ListHeaderComponent = useMemo(() => {
    if (!hasQuery || results.length === 0) return null;

    return (
      <View style={styles.listHeader}>
        <ThemedText type="caption" colorName="secondaryText">
          {formatTextCount(results.length)}
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
        {!hasQuery ? (
          <EmptyState
            icon="library-outline"
            title={STRINGS.SEARCH_TEXTS_IDLE_TITLE}
            hint={STRINGS.SEARCH_TEXTS_IDLE_HINT}
          />
        ) : isBodyLoading ? (
          <LoadingState message={STRINGS.SEARCH_TEXTS_BODY_LOADING} />
        ) : isBodyError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={STRINGS.SEARCH_TEXTS_INCOMPLETE_TITLE}
            hint={STRINGS.SEARCH_TEXTS_INCOMPLETE_HINT}
            action={{ label: STRINGS.RETRY, onPress: onRetryBody }}
          />
        ) : (
          <EmptyState
            icon="search-outline"
            title={STRINGS.SEARCH_TEXTS_NO_RESULTS_TITLE}
            hint={STRINGS.SEARCH_TEXTS_NO_RESULTS_HINT}
          />
        )}
      </View>
    ),
    [hasQuery, isBodyLoading, isBodyError, onRetryBody],
  );

  return (
    <ThemedView useSafeArea={false} style={styles.container}>
      <FlashList<ArticleSearchResult>
        data={results}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={ArticleRowSeparator}
        contentContainerStyle={listContentStyle}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        drawDistance={ARTICLE_LIST_DRAW_DISTANCE}
      />
    </ThemedView>
  );
};

SearchResultList.displayName = 'SearchResultList';
