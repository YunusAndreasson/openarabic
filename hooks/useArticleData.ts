import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// Services
import { articlesService } from '@/services/articles';
import { readingListService } from '@/services/readingList';
import { studyWordsService } from '@/services/studyWords';

// Types
import type { Article } from '@/types/articles.types';

export const useArticleData = (articleId: number | undefined, userId: string | undefined) => {
  // Fetch article data
  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesService.getArticleById(articleId!),
    enabled: !!articleId,
  });

  // Check if article is in reading list
  const { data: isInReadingList = false, refetch: refetchReadingListStatus } = useQuery({
    queryKey: ['isInReadingList', userId, articleId],
    queryFn: () => readingListService.isInReadingList(userId!, articleId!),
    enabled: !!userId && !!articleId,
  });

  // Fetch study words
  const { data: studyWords = [] } = useQuery({
    queryKey: ['studyWords', userId],
    queryFn: () => studyWordsService.getStudyWords(userId!, { forStats: false }),
    enabled: !!userId,
    staleTime: 60000, // 1 minute cache
  });

  // Fetch more articles by the same author
  const { data: moreArticles = [] } = useQuery({
    queryKey: ['articles', 'author', article?.author?.id],
    queryFn: () => articlesService.getArticles(undefined, article!.author!.id),
    enabled: !!article?.author?.id,
  });

  // Fetch more articles in the same category
  const { data: categoryArticles = [] } = useQuery({
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

    const wordsMap = new Map();
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
