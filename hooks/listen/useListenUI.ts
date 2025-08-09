import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

import { getArticleRoute, ROUTE_PATHS } from '@/constants/routes';
import { useAppDispatch } from '@/store/hooks';
import { setCustomOrder } from '@/store/listenSlice';
import type { ReadingListItem } from '@/types/readingList.types';
import { selectionFeedback } from '@/utils/haptics';

import { useAppPreloader } from '../app/useAppPreloader';

interface ListenUIParams {
  sortedReadingList: ReadingListItem[];
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
        router.push(getArticleRoute(articleId, article.title));
      }
    },
    [prefetchArticle, sortedReadingList, editMode]
  );

  const handleNowPlayingPress = useCallback(() => {
    // Open the now playing modal directly
    router.push({ pathname: ROUTE_PATHS.NOW_PLAYING });
  }, []);

  const handleDragEnd = useCallback(
    ({ data }: { data: ReadingListItem[] }) => {
      selectionFeedback();
      const newOrder = data.map(item => item.article_id);
      dispatch(setCustomOrder(newOrder));
    },
    [dispatch]
  );

  return {
    canShowEmpty,
    handleArticlePress,
    handleNowPlayingPress,
    handleDragEnd,
  };
};
