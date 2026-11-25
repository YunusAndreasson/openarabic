import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { DragEndParams } from 'react-native-draggable-flatlist';

import { STRINGS } from '@/constants/strings';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import { useAuth } from '@/hooks/auth/useAuth';
import { guestOrderChanged } from '@/store/guestLibrarySlice';
import { useAppDispatch } from '@/store/hooks';
import { setCustomOrder } from '@/store/playlistSlice';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { fillTemplate } from '@/utils/fillTemplate';
import { selectionFeedback } from '@/utils/haptics';
import { getArticleRoute } from '@/utils/routeBuilders';
import { runWhenIdle } from '@/utils/runWhenIdle';

interface ListenUIParams {
  sortedReadingList: BookmarkItem[];
  editMode: boolean;
}

export const usePlaylistUI = ({ sortedReadingList, editMode }: ListenUIParams) => {
  const prefetchArticle = useArticlePrefetch();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [canShowEmpty, setCanShowEmpty] = useState(false);

  useEffect(() => {
    const timeout = requestAnimationFrame(() => {
      setCanShowEmpty(true);
    });
    return () => cancelAnimationFrame(timeout);
  }, []);

  const handleArticlePress = useCallback(
    (articleId: ArticleId) => {
      if (editMode) return;

      const article = sortedReadingList.find(item => item.article_id === articleId)?.articles;
      if (article) {
        runWhenIdle(() => {
          prefetchArticle(articleId);
        });
        router.push(getArticleRoute(articleId, { source: 'playlist' }));
      }
    },
    [prefetchArticle, sortedReadingList, editMode],
  );

  const handleDragEnd = useCallback(
    ({ data, from, to }: DragEndParams<BookmarkItem>) => {
      if (from === to) return;
      selectionFeedback();
      const newOrder = data.map(item => item.article_id);
      dispatch(user ? setCustomOrder(newOrder) : guestOrderChanged(newOrder));
    },
    [dispatch, user],
  );

  function moveTrack(articleId: number, offset: -1 | 1) {
    const index = sortedReadingList.findIndex(item => item.article_id === articleId);
    const nextIndex = index + offset;
    const track = sortedReadingList[index];
    const neighbour = sortedReadingList[nextIndex];
    if (!editMode || !track || !neighbour) return;

    const reordered = sortedReadingList.slice();
    reordered[index] = neighbour;
    reordered[nextIndex] = track;
    handleDragEnd({ data: reordered, from: index, to: nextIndex });
    AccessibilityInfo.announceForAccessibility(
      fillTemplate(STRINGS.PLAYLIST_MOVED, {
        title: track.articles.title,
        position: nextIndex + 1,
        total: reordered.length,
      }),
    );
  }

  return {
    moveTrack,
    canShowEmpty,
    handleArticlePress,
    handleDragEnd,
  };
};
