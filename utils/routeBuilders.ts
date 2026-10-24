import type { Href } from 'expo-router';

import { ROUTE_PATHS } from '@/constants/routes';
import type { ArticleId, CategoryId, RootId } from '@/types/branded.types';

/*
 * Href objects, not hand-built query strings. Expo Router fills the dynamic
 * segment from `params`, URI-encodes the rest into the query string and drops
 * the nullish ones, so the URLs are the ones these builders used to spell out;
 * `satisfies Href` checks each pathname against the generated route list.
 */

interface ArticleRouteOptions {
  /**
   * Open at the top. The reader otherwise resumes at the learner's last-read
   * sentence, which is the wrong place to land from a card that starts a text
   * or from one word somewhere inside it.
   */
  readonly disableAutoScroll?: boolean;
  /** The sentence to bring into view. */
  readonly sentenceId?: number;
}

export const getArticleRoute = (
  id: ArticleId,
  { disableAutoScroll, sentenceId }: ArticleRouteOptions = {},
) =>
  ({
    pathname: ROUTE_PATHS.ARTICLE,
    params: {
      id,
      // The reader tests `=== 'true'`; left out rather than 'false'.
      disableAutoScroll: disableAutoScroll ? 'true' : undefined,
      sentenceId,
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
