import type { ErrorOptions } from '@/utils/errorHandling';
import { handleError } from '@/utils/errorHandling';
import { SupabaseRequestError } from '@/utils/supabaseHelpers';

/**
 * What a query tells the cache-level error reporter (`app/_layout.tsx`).
 *
 * Extends `Record<string, unknown>` because TanStack only accepts a registered
 * meta type assignable to it; a plain interface (no index signature) is not,
 * and would fall back to the untyped default without a word. The two keys
 * below stay typed.
 */
export interface AppQueryMeta extends Record<string, unknown> {
  /**
   * Never report this query's failure: no toast, no analytics, no Sentry. For
   * supplementary loads the screen is built to do without — the review lane's
   * examples, gloss alternates and root stories, which load per chunk and whose
   * absence the card simply absorbs.
   */
  silent?: boolean;
  /**
   * Reported when the failure carries no report of its own: an error thrown
   * outside `executeQuery`, or one whose report another query already made
   * (the reading list, loaded inside the audio tracks' queryFn).
   */
  errorReport?: ErrorOptions;
}

/** The mutation counterpart of {@link AppQueryMeta}; the same two switches. */
export type AppMutationMeta = AppQueryMeta;

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: AppQueryMeta;
    mutationMeta: AppMutationMeta;
  }
}

/**
 * The query and mutation caches' `onError`: report a failure once, after its
 * last retry.
 *
 * `executeQuery` used to report from inside the queryFn, so a query retried
 * three times reported four times — four toasts, four Sentry events, four
 * analytics events for one failure — and a service decided UI that its callers
 * contradicted (the review lane's loads toasted although their hooks are
 * documented as silent). A managed request now leaves its report on the error
 * (`SupabaseRequestError.takeReport`) and the cache makes it here, with the
 * query's `meta` deciding whether it is made at all.
 *
 * Errors with no pending report — a direct call's, already reported where it
 * threw, or a cancellation — are ignored unless `meta.errorReport` names one.
 */
export function reportQueryFailure(error: unknown, meta: AppQueryMeta | undefined): void {
  if (meta?.silent) return;

  const report =
    (error instanceof SupabaseRequestError ? error.takeReport() : undefined) ?? meta?.errorReport;
  if (report) void handleError(error, report);
}
