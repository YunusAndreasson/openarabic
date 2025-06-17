import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { UserSession } from '@/types/auth.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { STRINGS } from '@/constants/strings';

interface IntelligentArticleResult {
  article: Article | null;
  reason: string;
  type: 'due-words' | 'difficult-words' | 'beginner' | 'random';
}

export function useIntelligentArticleSelection(
  user: UserSession['user'] | null,
  articlesData: Article[]
): IntelligentArticleResult & { dueWordRootIds: Set<number> } {
  const { hasEnoughArticles: hasDueWordArticles, dueWordRootIds } = useArticlesByDueWords(
    user?.id,
    10
  );

  const { hasEnoughArticles: hasDifficultWordArticles, difficultWordRootIds } =
    useArticlesByDifficultWords(user?.id, 10);

  const { data: allStudyWords = [] } = useQuery({
    queryKey: FSRS_QUERY_KEYS.all(user?.id || ''),
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(user.id, {
        forStats: true,
        limit: 1,
      });
    },
    enabled: !!user?.id,
    staleTime: 180000,
    gcTime: 600000,
  });

  const hasAnyStudyWords = allStudyWords.length > 0;

  return useMemo(() => {
    if (!articlesData.length) {
      return {
        article: null,
        reason: STRINGS.LOADING_ARTICLES,
        type: 'random',
        dueWordRootIds: new Set<number>(),
      };
    }

    // Strategy 1: If user has due words and enough articles with those words
    if (user?.id && hasDueWordArticles && dueWordRootIds.size > 0) {
      const dueWordArticles = articlesData.filter(article =>
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) => dueWordRootIds.has(word.root_id))
        )
      );

      if (dueWordArticles.length > 0) {
        const randomArticle =
          dueWordArticles[Math.floor(Math.random() * dueWordArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE,
          type: 'due-words',
          dueWordRootIds,
        };
      }
    }

    // Strategy 2: If user has difficult words and study progress
    if (user?.id && hasDifficultWordArticles && difficultWordRootIds.size > 0 && hasAnyStudyWords) {
      const difficultWordArticles = articlesData.filter(article =>
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) =>
            difficultWordRootIds.has(word.root_id)
          )
        )
      );

      if (difficultWordArticles.length > 0) {
        const randomArticle =
          difficultWordArticles[Math.floor(Math.random() * difficultWordArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: STRINGS.CHOSEN_TO_REINFORCE_CHALLENGING,
          type: 'difficult-words',
          dueWordRootIds,
        };
      }
    }

    // Strategy 3: If user has no study progress, show beginner content
    if (!user?.id || !hasAnyStudyWords) {
      const beginnerArticles = getBeginnerArticles(articlesData);

      if (beginnerArticles.length > 0) {
        const randomArticle =
          beginnerArticles[Math.floor(Math.random() * beginnerArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: STRINGS.PERFECT_FOR_GETTING_STARTED,
          type: 'beginner',
          dueWordRootIds,
        };
      }
    }

    // Fallback: Random article
    const randomArticle = articlesData[Math.floor(Math.random() * articlesData.length)] ?? null;
    return {
      article: randomArticle,
      reason: STRINGS.RANDOMLY_SELECTED_FOR_DISCOVERY,
      type: 'random',
      dueWordRootIds,
    };
  }, [
    articlesData,
    user?.id,
    hasDueWordArticles,
    dueWordRootIds,
    hasDifficultWordArticles,
    difficultWordRootIds,
    hasAnyStudyWords,
  ]);
}
