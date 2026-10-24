import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getArticleRoute } from '@/constants/routes';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import { useAppDispatch } from '@/store/hooks';
import { setCustomOrder } from '@/store/playlistSlice';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { selectionFeedback } from '@/utils/haptics';
import { runWhenIdle } from '@/utils/runWhenIdle';

interface ListenUIParams {
  sortedReadingList: BookmarkItem[];
  editMode: boolean;
}

export const usePlaylistUI = ({ sortedReadingList, editMode }: ListenUIParams) => {
  const prefetchArticle = useArticlePrefetch();
  const dispatch = useAppDispatch();

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
        router.push(getArticleRoute(articleId, article.title));
      }
    },
    [prefetchArticle, sortedReadingList, editMode],
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: BookmarkItem[] }) => {
      selectionFeedback();
      const newOrder = data.map(item => item.article_id);
      dispatch(setCustomOrder(newOrder));
    },
    [dispatch],
  );

  return {
    canShowEmpty,
    handleArticlePress,
    handleDragEnd,
  };
};
