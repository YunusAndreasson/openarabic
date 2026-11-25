import { router } from 'expo-router';
import { FlatList } from 'react-native';

import { EmptyState } from '@/components/common';
import { ScreenStateHandler } from '@/components/common/ScreenStateHandler';
import { ArticleBookmarkButton } from '@/components/explore/ArticleBookmarkButton';
import { ArticleRowSeparator, useArticleListContentStyle } from '@/components/explore/ArticleRow';
import { PlaylistItemCard } from '@/components/playlist';
import { ThemedView } from '@/components/primitives/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReadingList } from '@/hooks/playlist/useReadingList';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { firstLoadError } from '@/utils/firstLoadError';
import { getArticleRoute } from '@/utils/routeBuilders';
import { sortByDateDesc } from '@/utils/sortingUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

const keyExtractor = (item: BookmarkItem) => String(item.article_id);

export default function ReadLaterScreen() {
  const { user } = useAuth();
  const { query, data } = useReadingList(user?.id);
  const listContentStyle = useArticleListContentStyle();
  const prefetchArticle = useArticlePrefetch();
  const saved = [...data].sort((left, right) => sortByDateDesc(left.added_at, right.added_at));
  const loading = query.isLoading || (query.isPlaceholderData && query.isFetching);
  const loadError = firstLoadError(
    { ...query, data: query.isPlaceholderData ? undefined : query.data },
    STRINGS.FAILED_TO_LOAD_READ_LATER,
  );

  return (
    <ThemedView useSafeArea={false} style={LAYOUT.COMMON_STYLES.CONTAINER}>
      <ScreenStateHandler
        isLoading={!saved.length && loading}
        isError={!saved.length && !!loadError}
        errorMessage={loadError ?? STRINGS.FAILED_TO_LOAD_READ_LATER}
        onRetry={() => void query.refetch()}
        isEmpty={!saved.length}
        empty={
          <EmptyState
            icon="bookmark-outline"
            title={STRINGS.READ_LATER_EMPTY_TITLE}
            hint={STRINGS.READ_LATER_EMPTY_HINT}
            action={{
              label: STRINGS.BROWSE_ARTICLES,
              onPress: () => router.dismissTo(ROUTE_PATHS.EXPLORE_TAB),
            }}
          />
        }
      >
        {/* Account handoff can replace the guest rows with a shorter list. */}
        <FlatList
          key={user?.id ?? 'guest'}
          testID="read-later-list"
          data={saved}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={ArticleRowSeparator}
          contentContainerStyle={listContentStyle}
          renderItem={({ item }) => {
            const articleId = item.article_id as ArticleId;
            const article = item.articles;
            return (
              <PlaylistItemCard
                articleId={articleId}
                title={article.title}
                secondaryText={getArticleMetadataWithoutCategory(article)}
                imageUrl={generateStorageUrl('images', article.image_url)}
                onPress={() => router.push(getArticleRoute(articleId))}
                onPressIn={() => prefetchArticle(articleId)}
                trailingAction={
                  <ArticleBookmarkButton articleId={articleId} title={article.title} />
                }
              />
            );
          }}
        />
      </ScreenStateHandler>
    </ThemedView>
  );
}
