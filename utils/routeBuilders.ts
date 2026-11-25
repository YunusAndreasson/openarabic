import type { Href } from 'expo-router';

import { ROUTE_PATHS } from '@/constants/routes';
import type { ArticleId, CategoryId, RootId } from '@/types/branded.types';

/*
 * Href objects, not hand-built query strings. Expo Router fills the dynamic
 * segment from `params`, URI-encodes the rest into the query string and drops
 * the nullish ones, so the URLs are the ones these builders used to spell out;
 * `satisfies Href` checks each pathname against the generated route list.
 */

/** Where the reader was opened from, as Article Viewed reports it. */
const ARTICLE_OPEN_SOURCES = [
  'public_browse',
  'intro_cta',
  'checklist',
  'continue',
  'featured',
  'discovery',
  'category',
  'search',
  'related',
  'playlist',
  'mini_player',
  'word',
] as const;

export type ArticleOpenSource = (typeof ARTICLE_OPEN_SOURCES)[number];

/** The reader's `source` param, or 'other' for none (a deep link) or one this build doesn't know. */
export const readArticleOpenSource = (param: string | undefined): ArticleOpenSource | 'other' =>
  ARTICLE_OPEN_SOURCES.find(source => source === param) ?? 'other';

export function getAccountFormRoute(form: 'sign-in' | 'sign-up', saveIntent?: string) {
  const pathname = form === 'sign-in' ? ROUTE_PATHS.AUTH_SIGN_IN : ROUTE_PATHS.AUTH_SIGN_UP;
  return saveIntent ? ({ pathname, params: { saveIntent } } satisfies Href) : pathname;
}

interface ArticleRouteOptions {
  /**
   * Open at the top. The reader otherwise resumes at the learner's last-read
   * sentence, which is the wrong place to land from a card that starts a text
   * or from one word somewhere inside it.
   */
  readonly disableAutoScroll?: boolean;
  /** The sentence to bring into view. */
  readonly sentenceId?: number;
  readonly wordId?: number;
  /** What opened the reader, for analytics only. */
  readonly source?: ArticleOpenSource;
}

export const getArticleRoute = (
  id: ArticleId,
  { disableAutoScroll, sentenceId, wordId, source }: ArticleRouteOptions = {},
) =>
  ({
    pathname: ROUTE_PATHS.ARTICLE,
    params: {
      id,
      // The reader tests `=== 'true'`; left out rather than 'false'.
      disableAutoScroll: disableAutoScroll ? 'true' : undefined,
      sentenceId,
      ...(wordId !== undefined && { wordId }),
      source,
    },
  }) satisfies Href;

export const getCategoryFilterRoute = (id: CategoryId, name?: string) =>
  ({
    pathname: ROUTE_PATHS.EXPLORE_FILTER,
    // An empty name is left out, as it always was: the screen titles itself
    // "Category" without one.
    params: { id, name: name || undefined },
  }) satisfies Href;

/**
 * Word detail. Lives inside the practice stack (not at the root) so it pushes
 * within the dictionary's modal instead of presenting behind it.
 */
export const getPracticeWordRoute = (rootId: RootId) =>
  ({ pathname: ROUTE_PATHS.PRACTICE_WORD, params: { rootId } }) satisfies Href;

/**
 * The word sheet, at the ROOT of the navigator rather than inside a tab.
 *
 * `getPracticeWordRoute` above is tab-scoped by design — it has to push inside
 * the dictionary's modal. This one is opened from the Explore tab, where that
 * path would jump tabs before the sheet ever appeared, so it is a root-level
 * `formSheet` alongside `/words-to-revisit` and presents over whichever tab the
 * learner is on.
 */
export const getWordDetailRoute = (rootId: RootId) =>
  ({ pathname: ROUTE_PATHS.WORD_DETAIL, params: { rootId } }) satisfies Href;

export const getDueWordReviewRoute = (dueRoot: RootId) =>
  ({ pathname: ROUTE_PATHS.REVIEW, params: { dueRoot } }) satisfies Href;

export const getSingleWordReviewRoute = (rootId: RootId) =>
  ({ pathname: ROUTE_PATHS.REVIEW, params: { rootId } }) satisfies Href;

export const getFirstReviewReceiptRoute = (rootId: RootId) =>
  ({ pathname: ROUTE_PATHS.PRACTICE_TAB, params: { reviewedRoot: rootId } }) satisfies Href;
