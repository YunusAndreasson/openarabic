import { useQuery, useQueryClient, type QueryObserverResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { articleQueries, fsrsQueries, gated, readingProgressQueries } from '@/constants/queries';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';

const EMPTY_STUDY_WORDS: StudyWord[] = [];

interface ArticleDataResult {
  article: Article | undefined;
  /** Fetching an article there is nothing of yet, a retry after a failure included */
  isLoadingArticle: boolean;
  /** The fetch failed, nothing is cached, and the article may well exist: retryable */
  isArticleError: boolean;
  /** The fetch failed for an article the published catalogue does not list */
  isArticleMissing: boolean;
  refetchArticle: () => void;
  isInReadingList: boolean;
  selectedWordIds: Set<number>;
  sortedSentences: Required<Article>['article_sentences'];
  sentenceWordsMap: Map<number, SentenceWord[]>;
  refetchStudyWords: () => Promise<QueryObserverResult<StudyWord[]>>;
  isLoadingStudyWords: boolean;
}

/**
 * Custom hook to fetch and process article data
 * @param articleId - The ID of the article to fetch
 * @param userId - The current user ID
 */
export const useArticleData = (
  articleId: ArticleId | undefined,
  userId: string | undefined,
): ArticleDataResult => {
  // Get theme colors for pre-computing word color analysis
  const colors = useColors();

  const queryClient = useQueryClient();

  // Fetch article data with optimized caching
  const {
    data: article,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery(articleQueries.detail(articleId));

  // A failed fetch only matters while there is no article to show. Reading
  // only `isLoading` used to send every failure — a dropped connection
  // included — to "Article not found ... It may have been removed", with no
  // retry. A retry after a failure counts as loading again.
  const hasFailed = isError && !article;
  const isLoadingArticle = isLoading || (hasFailed && isFetching);

  // `getArticleById` throws for a row that does not exist as well as for a
  // request that failed, so the error alone cannot tell them apart. The
  // published catalogue can: an id it does not list is gone, and retrying will
  // not bring it back. With no catalogue cached it stays a retryable failure.
  const catalogue = hasFailed ? queryClient.getQueryData(articleQueries.all().queryKey) : undefined;
  const isArticleMissing =
    hasFailed && catalogue !== undefined && !catalogue.some(entry => entry.id === articleId);
  const isArticleError = hasFailed && !isFetching && !isArticleMissing;

  // Whether this article is saved, read off the cached reading list — the
  // list the playlist and the audio tracks show — rather than a per-article
  // query of its own. That one went stale (it never refetched on mount) and
  // had to be patched by hand after every change; this one moves with the
  // list itself, wherever the article was saved or removed.
  const { data: isInReadingList = false } = useQuery({
    ...gated(readingProgressQueries.readingList, userId),
    select: readingList => readingList.some(item => item.article_id === articleId),
  });

  // Fetch study words with optimized caching
  // CRITICAL: Use same query as useSentenceSelectedRoots and useArticleWordInteractions for DRY consistency
  // Refetched only by cache invalidation or pull-to-refresh: not on mount (the
  // app-wide default) and not on reconnect.
  const studyWordsQuery = useQuery({
    ...gated(fsrsQueries.all, userId),
    refetchOnReconnect: false,
    placeholderData: old => old,
  });

  // Keep the fast cached-due fallback that individual words previously used,
  // but subscribe once for the screen instead of once per mounted word.
  const dueWordsQuery = useQuery({
    ...gated(fsrsQueries.due, userId),
    refetchOnReconnect: false,
    placeholderData: old => old,
  });

  const studyWords = studyWordsQuery.data ?? EMPTY_STUDY_WORDS;
  const dueWords = dueWordsQuery.data ?? EMPTY_STUDY_WORDS;
  // Joins a fetch already in flight instead of TanStack's default of cancelling
  // and restarting it. A word save triggers three refreshes of this same list —
  // the mutation's invalidation, its success callback and the save handler —
  // and each cancel-and-restart re-downloaded the whole vocabulary from its
  // first page (a cancelled fetch now stops paging, but what it had already
  // downloaded is wasted).
  const refetchStudyWords = () => studyWordsQuery.refetch({ cancelRefetch: false });
  const isLoadingStudyWords = studyWordsQuery.isLoading;

  // Process sentences from article data - no additional fetch needed
  const sortedSentences = useMemo(
    () =>
      article?.article_sentences
        ? [...article.article_sentences].sort((a, b) => a.position - b.position)
        : [],
    [article],
  );

  // Extract selected root IDs since study is now root-based
  const selectedWordIds = useMemo(
    () => new Set(studyWords.map(w => w.root_id)).union(new Set(dueWords.map(w => w.root_id))),
    [studyWords, dueWords],
  );

  // Create sentence words map from article data - no additional fetch needed
  // Pre-compute color analysis at load time for optimal render performance
  const sentenceWordsMap = useMemo(() => {
    const map = new Map<number, SentenceWord[]>();
    // Early return if no sentences or colors not ready
    if (!sortedSentences?.length || !colors) return map;

    // Process all sentences in one pass
    return sortedSentences.reduce((acc, sentence) => {
      if (sentence.sentence_words?.length) {
        const wordsWithColors = sentence.sentence_words
          .slice() // Create a new array to avoid mutating the original
          .sort((a, b) => a.position - b.position)
          .map(word => ({
            ...word,
            coloredSegments: computeColoredSegments(word.word_form, word.english || '', colors),
          }));
        acc.set(sentence.id, wordsWithColors);
      }
      return acc;
    }, new Map<number, SentenceWord[]>());
  }, [sortedSentences, colors]);

  return {
    article,
    isLoadingArticle,
    isArticleError,
    isArticleMissing,
    refetchArticle: () => void refetch(),
    isInReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isLoadingStudyWords,
  };
};
