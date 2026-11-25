import { useQuery, type QueryObserverResult } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useMemo } from 'react';

import { articleQueries, fsrsQueries, gated } from '@/constants/queries';
import { useReadingList } from '@/hooks/playlist/useReadingList';
import { useColors } from '@/hooks/theme/useColors';
import { ArticleNotFoundError, type Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';

const EMPTY_STUDY_WORDS: StudyWord[] = [];

// Article details stay in the query cache for a day. Keep the prepared words
// for the last reader only, and let them go if its source sentences are evicted.
type Sentences = NonNullable<Article['article_sentences']>;
let lastReaderWords = new WeakMap<
  Sentences,
  { colors: ThemeColors; words: Map<number, SentenceWord[]> }
>();

function prepareSentenceWords(
  source: Sentences | undefined,
  sortedSentences: Sentences,
  colors: ThemeColors,
) {
  if (!source?.length) return new Map<number, SentenceWord[]>();
  const previous = lastReaderWords.get(source);
  if (previous?.colors === colors) return previous.words;

  const words = new Map<number, SentenceWord[]>();
  for (const sentence of sortedSentences) {
    if (!sentence.sentence_words?.length) continue;
    const sortedWords = sentence.sentence_words.slice().sort((a, b) => a.position - b.position);
    words.set(
      sentence.id,
      sortedWords.map(word => ({
        ...word,
        coloredSegments: computeColoredSegments(word.word_form, word.english || '', colors),
      })),
    );
  }
  lastReaderWords = new WeakMap([[source, { colors, words }]]);
  return words;
}

interface ArticleDataResult {
  article: Article | undefined;
  /** Fetching an article there is nothing of yet, a retry after a failure included */
  isLoadingArticle: boolean;
  /** The fetch failed, nothing is cached, and the article may well exist: retryable */
  isArticleError: boolean;
  /** The lookup completed and there was no published article at this ID */
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

  // Fetch article data with optimized caching
  const {
    data: article,
    isLoading,
    error,
    isPaused,
    isFetching,
    refetch,
  } = useQuery(articleQueries.detail(articleId));

  const isLoadingArticle = isLoading || (!article && isFetching);
  const isArticleMissing = !article && error instanceof ArticleNotFoundError;
  // An offline first read is paused before the service can return an error.
  const isArticleError = !article && !isFetching && !isArticleMissing && (isPaused || !!error);

  // Whether this article is saved, read off the cached reading list — the
  // list the playlist and the audio tracks show — rather than a per-article
  // query of its own. That one went stale (it never refetched on mount) and
  // had to be patched by hand after every change; this one moves with the
  // list itself, wherever the article was saved or removed.
  const { data: readingList } = useReadingList(userId);
  const isInReadingList = readingList.some(item => item.article_id === articleId);

  // Fetch study words with optimized caching
  // CRITICAL: Use same query as useSentenceSelectedRoots and useArticleWordInteractions for DRY consistency
  // Refetched only by cache invalidation or pull-to-refresh: not on mount (the
  // app-wide default) and not on reconnect.
  const studyWordsQuery = useQuery({
    ...gated(fsrsQueries.all, userId),
    refetchOnReconnect: false,
  });

  // Keep the fast cached-due fallback that individual words previously used,
  // but subscribe once for the screen instead of once per mounted word.
  const dueWordsQuery = useQuery({
    ...gated(fsrsQueries.due, userId),
    refetchOnReconnect: false,
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
  const sentences = article?.article_sentences;
  const sortedSentences = useMemo(
    () => (sentences ? [...sentences].sort((a, b) => a.position - b.position) : []),
    [sentences],
  );

  // Extract selected root IDs since study is now root-based
  const selectedWordIds = useMemo(
    () => new Set(studyWords.map(w => w.root_id)).union(new Set(dueWords.map(w => w.root_id))),
    [studyWords, dueWords],
  );

  const sentenceWordsMap = useMemo(
    () => prepareSentenceWords(sentences, sortedSentences, colors),
    [sentences, sortedSentences, colors],
  );

  return {
    article,
    isLoadingArticle,
    isArticleError,
    isArticleMissing,
    refetchArticle: () => {
      // A missed handover can leave a query paused on its old network state.
      // refresh() notifies onlineManager; the retry joins any reconnect fetch.
      if (isPaused) void NetInfo.refresh().catch(() => undefined);
      void refetch({ cancelRefetch: false });
    },
    isInReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isLoadingStudyWords,
  };
};
