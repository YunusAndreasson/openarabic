import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Services
import { articlesService } from '@/services/articles';
import { readingListService } from '@/services/readingList';
import { studyWordsService } from '@/services/studyWords';

// Types
import type { Article, ArticleSentence } from '@/types/articles.types';
import type { StudyWord, SentenceWord } from '@/types/vocabulary.types';

/**
 * Custom hook to fetch and manage article data
 *
 * @param articleId - The ID of the article to fetch
 * @param userId - The current user ID (if authenticated)
 * @param isDataPrefetched - Whether the article data has been prefetched (optimizes loading)
 * @returns Object containing article data and related data
 */
export const useArticleData = (
  articleId: number | undefined,
  userId: string | undefined,
  isDataPrefetched: boolean = false
): {
  article: Article | undefined;
  isLoadingArticle: boolean;
  isInReadingList: boolean;
  refetchReadingListStatus: () => Promise<unknown>;
  studyWords: StudyWord[];
  selectedWordIds: Set<string>;
  sortedSentences: ArticleSentence[];
  sentenceWordsMap: Map<number, SentenceWord[]>;
  otherArticles: Article[];
  otherCategoryArticles: Article[];
} => {
  // Get queryClient for cache access
  const queryClient = useQueryClient();

  // Normalize the isDataPrefetched parameter to ensure it's a boolean
  const isPrefetched = Boolean(isDataPrefetched);

  // Fetch article data with optimized staleTime when prefetched
  const { data: article, isLoading: isLoadingArticle } = useQuery<Article>({
    queryKey: ['article', articleId],
    queryFn: () => articlesService.getArticleById(articleId!),
    enabled: !!articleId,
    // Increase staleTime when data is prefetched to reduce refetching
    staleTime: isPrefetched ? 60000 : 0, // 1 minute cache when prefetched
  });

  // Get initial reading list data from cache if available
  const cachedReadingListStatus =
    isPrefetched && userId && articleId
      ? queryClient.getQueryData(['isInReadingList', userId, articleId])
      : undefined;

  // Check if article is in reading list with optimized behavior
  const { data: isInReadingList = false, refetch: refetchReadingListStatus } = useQuery<boolean>({
    queryKey: ['isInReadingList', userId, articleId],
    queryFn: () => readingListService.isInReadingList(userId!, articleId!),
    enabled: !!userId && !!articleId,
    // Use cached data when available
    initialData: cachedReadingListStatus as boolean | undefined,
  });

  // Fetch study words
  const { data: studyWords = [] } = useQuery<StudyWord[]>({
    queryKey: ['studyWords', userId],
    queryFn: () => studyWordsService.getStudyWords(userId!, { forStats: false }),
    enabled: !!userId,
    staleTime: 60000, // 1 minute cache
  });

  // Fetch more articles by the same author
  const { data: moreArticles = [] } = useQuery<Article[]>({
    queryKey: ['articles', 'author', article?.author?.id],
    queryFn: () => articlesService.getArticles(undefined, article!.author!.id),
    enabled: !!article?.author?.id,
  });

  // Fetch more articles in the same category
  const { data: categoryArticles = [] } = useQuery<Article[]>({
    queryKey: ['articles', 'category', article?.category?.id],
    queryFn: () => articlesService.getArticles(article!.category!.id),
    enabled: !!article?.category?.id,
  });

  // Derived state
  const selectedWordIds = useMemo(
    () => new Set(studyWords.map(w => w.sentence_word_id)),
    [studyWords]
  );

  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) return [];
    return [...article.article_sentences].sort((a, b) => a.position - b.position);
  }, [article?.article_sentences]);

  const sentenceWordsMap = useMemo(() => {
    if (!sortedSentences.length) return new Map();

    const wordsMap = new Map<number, SentenceWord[]>();
    sortedSentences.forEach(sentence => {
      wordsMap.set(
        sentence.id,
        [...sentence.sentence_words].sort((a, b) => a.position - b.position)
      );
    });
    return wordsMap;
  }, [sortedSentences]);

  const otherArticles = useMemo(
    () => moreArticles.filter(a => a.id !== article?.id),
    [moreArticles, article?.id]
  );

  const otherCategoryArticles = useMemo(
    () => categoryArticles.filter(a => a.id !== article?.id),
    [categoryArticles, article?.id]
  );

  return {
    article,
    isLoadingArticle,
    isInReadingList,
    refetchReadingListStatus,
    studyWords,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    otherArticles,
    otherCategoryArticles,
  };
};

export default useArticleData;
