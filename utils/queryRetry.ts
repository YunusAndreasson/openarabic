import { onlineManager, type DefaultError } from '@tanstack/react-query';

/**
 * Client errors that are still worth another attempt: an expired token the
 * auth client is refreshing (401), a request timeout (408) and rate limiting
 * (429). Every other 4xx is the request itself being wrong — an RLS denial, a
 * 406 on `.single()`, a 409 conflict — and fails the same way however often it
 * is sent.
 */
const RETRYABLE_CLIENT_STATUSES: ReadonlySet<number> = new Set([401, 408, 429]);

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return undefined;
}

/**
 * Whether a failure could go differently on a second attempt.
 *
 * Reads `status` off any error that carries one: `SupabaseRequestError`
 * (utils/supabaseHelpers.ts) for PostgREST, and supabase-js's own auth errors.
 * A failure with no status — a dropped connection is status 0 — is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  const status = statusOf(error);
  if (status === undefined || status < 400 || status >= 500) return true;
  return RETRYABLE_CLIENT_STATUSES.has(status);
}

/**
 * The app's one retry policy, for every query and mutation: up to
 * `maxRetries` more attempts, but none while offline and none for a request
 * that cannot succeed (see {@link isRetryableError}).
 *
 * It has to be this function everywhere, never a bare number. A number tells
 * TanStack's retryer to sleep and then PAUSE until the device is back online —
 * so an awaited fetch made offline never settled at all, which is how an
 * offline cold start used to hold the splash screen until the network
 * returned. A factory's `retry` replaces the client default outright
 * (`queryClient.query()` and `useQuery` both merge it over the default), so one
 * bare `retry: 3` was enough to bypass this for that query everywhere it ran.
 *
 * The error parameter is `DefaultError`, not `unknown`, on purpose:
 * `queryOptions` infers a query's error type from this function's signature,
 * and `unknown` there would widen every query's `error` away from `Error`.
 */
export const retryWhileOnline =
  (maxRetries: number) =>
  (failureCount: number, error: DefaultError): boolean =>
    onlineManager.isOnline() && isRetryableError(error) && failureCount < maxRetries;
