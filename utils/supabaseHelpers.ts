import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

import { checkAuthentication } from '@/services/supabase';
import type { ErrorOptions } from '@/utils/errorHandling';
import { handleError } from '@/utils/errorHandling';

/**
 * A failed PostgREST request, as a real `Error` that keeps the HTTP status.
 *
 * supabase-js resolves a failure as a plain `{ message, details, hint, code }`
 * object, with the status beside it on the response rather than in it. Thrown
 * as it came, the error carried no status, so the query layer's "never retry a
 * client error" rule (`utils/queryRetry.ts`) could not fire: an RLS denial, a
 * 406 or a 409 was retried — and reported — three or four times.
 *
 * `name` stays Error's own. Sentry groups issues by exception type, and these
 * were always reported as a plain `Error`; renaming the type would split every
 * existing issue in two.
 */
export class SupabaseRequestError extends Error {
  /** HTTP status; 0 when the request never got a response (offline, aborted, timed out). */
  readonly status: number;
  readonly code: string;
  readonly details: string;
  readonly hint: string;

  constructor(
    error: Pick<PostgrestError, 'message' | 'code' | 'details' | 'hint'>,
    status: number,
  ) {
    super(error.message);
    this.status = status;
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}

/**
 * Executes a Supabase query with consistent error handling
 *
 * Typed off the response rather than a hand-written result shape: the data type
 * is read from the success member of supabase-js's own response union, so a
 * `.maybeSingle()` row comes back as `Row | null` and a list as `Row[]` without
 * an explicit generic or a cast. (The previous signature typed every
 * `.maybeSingle()` as `null`, which is what forced the overrides and the dead
 * `?? []` guards that used to follow these calls.)
 *
 * @param queryFn Function that returns a Supabase query builder
 * @param errorConfig Configuration for error handling
 * @returns The data from the query
 * @throws SupabaseRequestError if the query fails (after logging and showing toast)
 *
 * @example
 * const articles = await executeQuery(
 *   () => supabase.from('articles').select('*'),
 *   {
 *     toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
 *     analyticsEventName: 'Articles_Load_Error',
 *   }
 * );
 */
export async function executeQuery<T>(
  queryFn: () => PromiseLike<PostgrestSingleResponse<T>>,
  errorConfig: ErrorOptions = {},
): Promise<T> {
  const response = await queryFn();

  if (!response.error) return response.data;

  const error = new SupabaseRequestError(response.error, response.status);

  // Forwarded whole rather than field-by-field: the seven-line copy this
  // replaced re-stated `sentrySeverity: ... || 'error'` and
  // `showToast: ... !== false`, both of which `handleError`'s own defaults
  // already apply — and silently dropped every option it hadn't been taught
  // about (`toastType`, `trackAnalytics`, `captureSentry`).
  //
  // Forwarding whole is only safe because `handleError` ignores explicitly-
  // undefined values (see `applyDefaults`). Under a plain spread this line
  // would turn `executeQuery(fn, { showToast: maybeUndefined })` into a
  // silently swallowed error, since the old per-field copy's `!== false`
  // happened to normalise exactly that case.
  await handleError(error, errorConfig);
  throw error;
}

/**
 * Executes a Supabase query with authentication check and consistent error handling
 *
 * @param userId User ID to authenticate
 * @param queryFn Function that returns a Supabase query builder
 * @param errorConfig Configuration for error handling
 * @returns The data from the query
 * @throws Authentication error or query error (after logging)
 *
 * @example
 * const bookmarks = await executeAuthenticatedQuery(
 *   userId,
 *   () => supabase.from('reading_list').select('*').eq('user_id', userId),
 *   {
 *     toastMessage: STRINGS.FAILED_TO_LOAD_BOOKMARKS,
 *     analyticsEventName: 'Reading_List_Load_Error',
 *   }
 * );
 */
export async function executeAuthenticatedQuery<T>(
  userId: string,
  queryFn: () => PromiseLike<PostgrestSingleResponse<T>>,
  errorConfig: ErrorOptions = {},
): Promise<T> {
  await checkAuthentication(userId);
  return executeQuery(queryFn, errorConfig);
}
