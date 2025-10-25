import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

import { getArticleRoute } from '@/constants/routes';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAppDispatch } from '@/store/hooks';
import { setCustomOrder } from '@/store/playlistSlice';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { selectionFeedback } from '@/utils/haptics';

interface ListenUIParams {
  sortedReadingList: BookmarkItem[];
  editMode: boolean;
}

export const useListenUI = ({ sortedReadingList, editMode }: ListenUIParams) => {
  const { prefetchArticle } = useAppPreloader();
  const dispatch = useAppDispatch();

  const [canShowEmpty, setCanShowEmpty] = useState(false);

  useEffect(() => {
    const timeout = requestAnimationFrame(() => {
      setCanShowEmpty(true);
    });
    return () => cancelAnimationFrame(timeout);
  }, []);

  const handleArticlePress = useCallback(
    (articleId: number) => {
      if (editMode) return;

      const article = sortedReadingList.find(item => item.article_id === articleId)?.articles;
      if (article) {
        InteractionManager.runAfterInteractions(() => prefetchArticle(articleId));
        router.push(getArticleRoute(articleId as ArticleId, article.title));
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
