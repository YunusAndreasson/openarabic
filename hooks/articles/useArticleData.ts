import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { CACHE_TIMES } from '@/constants/queryConfig';
import { articlesService } from '@/services/articles';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import type { Article } from '@/types/articles.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

interface ArticleDataResult {
  article: Article | undefined;
  isLoadingArticle: boolean;
  articleError: Error | null;
  isInReadingList: boolean;
  refetchReadingListStatus: () => void;
  isLoadingReadingList: boolean;
  selectedWordIds: Set<number>;
  sortedSentences: Required<Article>['article_sentences'];
  sentenceWordsMap: Map<number, SentenceWord[]>;
  refetchStudyWords: () => void;
  isLoadingStudyWords: boolean;
}

/**
 * Custom hook to fetch and process article data
 * @param articleId - The ID of the article to fetch
 * @param userId - The current user ID
 */
export const useArticleData = (
  articleId: number | undefined,
  userId: string | undefined
): ArticleDataResult => {
  // Fetch article data with optimized caching
  const {
    data: article,
    isLoading: isLoadingArticle,
    error: articleError,
  } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => {
      if (!articleId) throw new Error('Article ID is required');
      return articlesService.getArticleById(articleId);
    },
    enabled: !!articleId,
    staleTime: 3600000, // 1 hour - articles update max once a day
    gcTime: 7200000, // 2 hours
    refetchOnMount: false, // Don't refetch on mount if we have data
    placeholderData: old => old, // Keep old data while fetching
  });

  // Check if article is in user's reading list - optimized caching
  const {
    data: isInReadingList = false,
    refetch: refetchReadingListStatus,
    isLoading: isLoadingReadingList,
  } = useQuery({
    queryKey: ['readingList', userId, articleId],
    queryFn: () => {
      if (!userId || !articleId) throw new Error('User ID and Article ID are required');
      return readingListService.isInReadingList(userId, articleId);
    },
    enabled: !!userId && !!articleId,
    ...CACHE_TIMES.MEDIUM, // 3 minutes - reading list changes moderately
    refetchOnMount: false,
  });

  // Fetch study words with optimized caching
  const {
    data: studyWords = [],
    refetch: refetchStudyWords,
    isLoading: isLoadingStudyWords,
  } = useQuery<StudyWord[]>({
    queryKey: userId ? FSRS_QUERY_KEYS.all(userId) : ['fsrs-words'],
    queryFn: async () => {
      if (!userId) return [];
      return studyWordsFSRSService.getFSRSWords(userId);
    },
    enabled: !!userId,
    ...CACHE_TIMES.MEDIUM, // 3 minutes - study words change moderately
    networkMode: 'always',
    retry: 3,
    refetchOnMount: true, // Previously 'always', now true to respect staleTime
    refetchOnWindowFocus: true, // Also refetch when window gets focus
    placeholderData: old => old,
  });

  // Process sentences from article data - no additional fetch needed
  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) {
      return [];
    }
    return [...article.article_sentences].sort((a, b) => a.position - b.position);
  }, [article?.article_sentences]);

  // Extract selected root IDs since study is now root-based
  const selectedWordIds = useMemo(() => {
    // Skip recalculation if no study words
    if (!studyWords.length) return new Set<number>();

    const ids = new Set<number>();
    studyWords.forEach(w => {
      if (w.root_id != null) {
        ids.add(w.root_id);
      }
    });
    return ids;
  }, [studyWords]);

  // Create sentence words map from article data - no additional fetch needed
  const sentenceWordsMap = useMemo(() => {
    const map = new Map<number, SentenceWord[]>();
    // Early return if no sentences
    if (!sortedSentences?.length) return map;

    // Process all sentences in one pass
    return sortedSentences.reduce((acc, sentence) => {
      if (sentence.sentence_words?.length) {
        acc.set(
          sentence.id,
          sentence.sentence_words
            .slice() // Create a new array to avoid mutating the original
            .sort((a, b) => a.position - b.position)
            .map(word => ({
              ...word,
              root: {
                id: word.root_id,
                letters: '',
                meaning: null,
                audio_url: null,
                audio_url_en: null,
              },
              word_type: {
                id: word.word_type_id,
                name: '',
              },
            }))
        );
      }
      return acc;
    }, new Map<number, SentenceWord[]>());
  }, [sortedSentences]);

  // Related articles functionality removed

  return {
    article,
    isLoadingArticle,
    articleError,
    isInReadingList,
    refetchReadingListStatus,
    isLoadingReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isLoadingStudyWords,
  };
};

export default useArticleData;
