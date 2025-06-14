import { router } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';

import type { AudioState } from '@/constants/audio';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCustomOrder } from '@/store/listenSlice';
import type { Article } from '@/types/articles.types';
import { selectionFeedback } from '@/utils/haptics';

import type { ReadingListItem } from './useListenScreen';

interface ListenUIParams {
  sortedReadingList: ReadingListItem[];
  metadata: { articleId: string | null; articleTitle: string | null };
  audioState: AudioState;
  isStartingPlayback: boolean;
}

export const useListenUI = ({
  sortedReadingList,
  metadata,
  audioState,
  isStartingPlayback,
}: ListenUIParams) => {
  const { prefetchArticle } = useAppPreloader();
  const dispatch = useAppDispatch();
  const editMode = useAppSelector(state => state.listen.editMode);

  const [canShowEmpty, setCanShowEmpty] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanShowEmpty(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const metadataValues = useMemo(
    () => ({
      articleId: metadata.articleId,
      articleTitle: metadata.articleTitle,
    }),
    [metadata.articleId, metadata.articleTitle]
  );

  const flashListExtraData = useMemo(
    () => ({
      metadataValues,
      audioState,
      editMode,
    }),
    [metadataValues, audioState, editMode]
  );

  const currentArticle = useMemo<Partial<Article> | Article | null>(() => {
    if (isStartingPlayback && sortedReadingList.length > 0) {
      return sortedReadingList[0]?.articles || null;
    }

    if (!metadata.articleId || !sortedReadingList.length) return null;

    const articleIdNumber = parseInt(metadata.articleId ?? '', 10);
    if (isNaN(articleIdNumber)) return null;

    const currentItem = sortedReadingList.find(item => item.article_id === articleIdNumber);
    const foundArticle = currentItem?.articles;

    // If we have metadata but no article yet, create a minimal article object
    if (!foundArticle && metadata.articleTitle) {
      return {
        id: articleIdNumber,
        title: metadata.articleTitle,
        author: { name: 'Loading...' },
        image_url: '',
        placeholder: '',
      } as Partial<Article>; // Minimal article for display purposes
    }

    return foundArticle || null;
  }, [isStartingPlayback, sortedReadingList, metadata.articleId, metadata.articleTitle]);

  const handleArticlePress = useCallback(
    (articleId: number) => {
      if (editMode) return;

      const article = sortedReadingList.find(item => item.article_id === articleId)?.articles;
      if (article) {
        prefetchArticle(articleId);
        router.push(
          `/(tabs)/read/article/${articleId}?headerTitle=${encodeURIComponent(article.title)}`
        );
      }
    },
    [prefetchArticle, sortedReadingList, editMode]
  );

  const handleNowPlayingPress = useCallback(() => {
    if (currentArticle) {
      router.push(
        `/(tabs)/read/article/${currentArticle.id}?headerTitle=${encodeURIComponent(currentArticle.title)}`
      );
    }
  }, [currentArticle]);

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
    metadataValues,
    flashListExtraData,
    currentArticle,
    handleArticlePress,
    handleNowPlayingPress,
    handleDragEnd,
  };
};
