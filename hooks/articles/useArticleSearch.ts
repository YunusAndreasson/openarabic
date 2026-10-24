import { useQuery } from '@tanstack/react-query';
import { useDeferredValue } from 'react';

import { articleQueries } from '@/constants/queries';
import type { Article, SearchCorpusSentence } from '@/types/articles.types';
import { normalizeForSearch, tokenizeSearchQuery } from '@/utils/searchNormalization';
import { getAuthorDisplayName, getCategoryDisplayName } from '@/utils/stringUtils';

/**
 * Below this, a query matches so much of the library that the results are
 * noise — and on a two-letter Arabic query, nearly every text contains it.
 */
const MIN_QUERY_LENGTH = 2;

/**
 * The list is ranked, so what falls off the end is what matched worst. Well
 * past what anyone scrolls, and it keeps the row count bounded no matter how
 * common a word is.
 */
const MAX_RESULTS = 50;

/** Characters of surrounding sentence to keep on either side of a body hit. */
const SNIPPET_CONTEXT = 40;

/**
 * Where a text matched, best first. The order is the whole ranking: someone
 * typing "foresight" wants *The Discipline of Foresight* above a text that
 * merely mentions foresight in its ninth sentence.
 */
const MatchRank = {
  TitlePrefix: 0,
  Title: 1,
  /** Book, author or category — the ways a learner names a *group* of texts. */
  Meta: 2,
  Summary: 3,
  Body: 4,
  /**
   * No single field held every word, but the catalogue fields between them did
   * — "khatir foresight" is the book plus the title. Last, because a match
   * spread across fields is the weakest evidence that this is the text meant.
   */
  Scattered: 5,
} as const;

type MatchRank = (typeof MatchRank)[keyof typeof MatchRank];

/** One article, folded once, ready to be tested against a query. */
interface ArticleSearchEntry {
  article: Article;
  title: string;
  /** Book, author and category — both the raw names and their display forms. */
  meta: string;
  summary: string;
  /** Title, meta and summary joined, for the scattered-match fallback. */
  combined: string;
}

/**
 * One sentence, folded on both sides so either language can match.
 *
 * The snippet is always drawn from the ENGLISH side, even when the Arabic
 * matched. The row it lands in is a one-line, Latin-styled label, and Arabic
 * dropped into one loses its shaping and its direction; the English of the same
 * sentence is that sentence's own translation, so it answers "why is this text
 * here?" just as well and renders correctly. `text` falls back to the Arabic
 * only for a sentence with no English at all.
 */
interface BodySentence {
  arabic: string;
  english: string;
  /** Raw English (or Arabic, if there is no English) — what the row shows. */
  text: string;
}

type BodyIndex = Map<number, BodySentence[]>;

export interface ArticleSearchResult {
  article: Article;
  /**
   * The matching sentence, trimmed around the hit — present only when the body
   * is where the text matched, so the row can show *why* it is in the list.
   */
  bodySnippet?: string;
}

export interface UseArticleSearchResult {
  results: ArticleSearchResult[];
  /** True once the query is long enough to have been run. */
  hasQuery: boolean;
  /** The sentence corpus is still downloading; catalogue matches show already. */
  isBodyLoading: boolean;
  isBodyError: boolean;
  retryBody: () => void;
}

/**
 * Folds the cached catalogue once. Module scope so TanStack sees a stable
 * `select` identity and reuses the result until the article list itself
 * changes — which, at `staleTime: Infinity`, is never within a session.
 */
function buildMetadataIndex(articles: Article[]): ArticleSearchEntry[] {
  return articles.map(article => {
    const title = normalizeForSearch(article.title);
    // Both spellings: the raw database name and the transliteration the UI
    // shows. A learner searching "Ibn al-Jawzi" is reading the display form.
    const meta = normalizeForSearch(
      [
        article.book ?? '',
        article.author.name,
        getAuthorDisplayName(article.author.name),
        article.category.name,
        getCategoryDisplayName(article.category.name),
      ].join(' '),
    );
    const summary = normalizeForSearch(article.summary);

    return { article, title, meta, summary, combined: `${title} ${meta} ${summary}` };
  });
}

/**
 * Folds the sentence corpus into per-article buckets, both languages per row so
 * a query in either script can hit the same sentence.
 */
function buildBodyIndex(sentences: SearchCorpusSentence[]): BodyIndex {
  const index: BodyIndex = new Map();

  for (const sentence of sentences) {
    let bucket = index.get(sentence.article_id);
    if (!bucket) {
      bucket = [];
      index.set(sentence.article_id, bucket);
    }

    bucket.push({
      arabic: normalizeForSearch(sentence.arabic),
      english: normalizeForSearch(sentence.english),
      text: sentence.english || sentence.arabic,
    });
  }

  return index;
}

const containsAll = (haystack: string, tokens: string[]): boolean =>
  tokens.every(token => haystack.includes(token));

/**
 * Cuts the sentence down to the hit and its surroundings, so a long sentence
 * does not push the rest of the row off screen. Ellipses mark what was cut.
 */
function buildSnippet(sentence: BodySentence, token: string): string {
  // Positioned against the English fold, which is what `text` holds. An Arabic
  // match finds nothing here and simply shows the sentence from its start —
  // the row ellipsizes it to one line either way.
  const hit = sentence.english.indexOf(token);
  if (hit === -1 || sentence.text.length <= SNIPPET_CONTEXT * 2) {
    return sentence.text;
  }

  // The folded string is shorter than the raw one (marks were removed), so the
  // index is an approximation of where to cut. It only has to land near the
  // hit — this is a preview, not a highlight.
  const start = Math.max(0, hit - SNIPPET_CONTEXT);
  const end = Math.min(sentence.text.length, hit + token.length + SNIPPET_CONTEXT);

  return `${start > 0 ? '…' : ''}${sentence.text.slice(start, end).trim()}${
    end < sentence.text.length ? '…' : ''
  }`;
}

interface RankedMatch {
  rank: MatchRank;
  bodySnippet?: string;
}

function rankEntry(
  entry: ArticleSearchEntry,
  tokens: string[],
  normalizedQuery: string,
  bodyIndex: BodyIndex | undefined,
): RankedMatch | null {
  if (entry.title.startsWith(normalizedQuery)) {
    return { rank: MatchRank.TitlePrefix };
  }
  if (containsAll(entry.title, tokens)) {
    return { rank: MatchRank.Title };
  }
  if (containsAll(entry.meta, tokens)) {
    return { rank: MatchRank.Meta };
  }
  if (containsAll(entry.summary, tokens)) {
    return { rank: MatchRank.Summary };
  }

  const sentences = bodyIndex?.get(entry.article.id);
  if (sentences) {
    const firstToken = tokens[0] as string;
    const hit = sentences.find(
      sentence => containsAll(sentence.english, tokens) || containsAll(sentence.arabic, tokens),
    );
    if (hit) {
      return { rank: MatchRank.Body, bodySnippet: buildSnippet(hit, firstToken) };
    }
  }

  if (containsAll(entry.combined, tokens)) {
    return { rank: MatchRank.Scattered };
  }

  return null;
}

/**
 * Searches the library by catalogue and by contents.
 *
 * Both indexes are local: the catalogue comes from the article list already in
 * cache, and the sentence corpus is fetched once when this hook first runs.
 * Nothing is queried per keystroke — the database has no text index and cannot
 * fold diacritics, so matching it server-side would be both slower and wrong
 * (see `utils/searchNormalization.ts`).
 *
 * Catalogue results appear immediately; body results join them when the corpus
 * lands. `useDeferredValue` keeps typing responsive under the re-rank, which is
 * the house alternative to a debounce (`hooks/account/useFAQSearch.ts`).
 */
export function useArticleSearch(query: string): UseArticleSearchResult {
  const deferredQuery = useDeferredValue(query);

  const { data: entries } = useQuery({
    ...articleQueries.all(),
    select: buildMetadataIndex,
  });

  const {
    data: bodyIndex,
    isLoading: isBodyLoading,
    isError: isBodyError,
    refetch: refetchBody,
  } = useQuery({
    ...articleQueries.searchCorpus(),
    select: buildBodyIndex,
  });

  const trimmed = deferredQuery.trim();
  const hasQuery = trimmed.length >= MIN_QUERY_LENGTH;
  const normalizedQuery = hasQuery ? normalizeForSearch(trimmed) : '';
  const tokens = normalizedQuery ? tokenizeSearchQuery(normalizedQuery) : [];

  const results: ArticleSearchResult[] = [];

  if (tokens.length > 0 && entries) {
    const matched: (RankedMatch & { entry: ArticleSearchEntry; order: number })[] = [];

    entries.forEach((entry, order) => {
      const match = rankEntry(entry, tokens, normalizedQuery, bodyIndex);
      if (match) matched.push({ ...match, entry, order });
    });

    // Rank first, then the catalogue's own order — which is newest first, so
    // equally good matches surface the most recent text.
    matched.sort((a, b) => a.rank - b.rank || a.order - b.order);

    for (const match of matched.slice(0, MAX_RESULTS)) {
      results.push({
        article: match.entry.article,
        ...(match.bodySnippet !== undefined && { bodySnippet: match.bodySnippet }),
      });
    }
  }

  return {
    results,
    hasQuery,
    isBodyLoading,
    isBodyError,
    retryBody: () => void refetchBody(),
  };
}
