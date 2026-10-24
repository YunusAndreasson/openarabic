import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

import { POSTGREST_MAX_ROWS } from '@/constants/supabase';
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
  private pendingReport: ErrorOptions | undefined;

  constructor(
    error: Pick<PostgrestError, 'message' | 'code' | 'details' | 'hint'>,
    status: number,
    pendingReport?: ErrorOptions,
  ) {
    super(error.message);
    this.status = status;
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
    this.pendingReport = pendingReport;
  }

  /**
   * The report a managed request left for the query or mutation cache to make
   * (see {@link RequestOptions.managed}) — handed out once. A failure can
   * surface through two queries (the reading list loaded inside the audio
   * tracks' queryFn), and it is still one failure, so it is reported once.
   */
  takeReport(): ErrorOptions | undefined {
    const report = this.pendingReport;
    this.pendingReport = undefined;
    return report;
  }
}

/** How one request is made, and who reports it if it fails. */
export interface RequestOptions {
  /** Cancels the request: TanStack's queryFn `signal`, for the heavy paged reads. */
  readonly signal?: AbortSignal;
  /**
   * The request runs inside a TanStack query or mutation function, so its
   * failure is reported by the query or mutation cache (`app/_layout.tsx`) —
   * once, after the last retry — instead of here, on every attempt. Set only
   * through {@link managedRequest}. A direct call (the background task, the
   * reader's unmount flush, a settings action) leaves it unset and keeps
   * reporting at the throw, so a failure outside TanStack still reaches the
   * user and Sentry.
   */
  readonly managed?: boolean;
}

/** The {@link RequestOptions} of a request made from a queryFn or mutationFn. */
export const managedRequest = (signal?: AbortSignal): RequestOptions => ({ managed: true, signal });

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
 * A failure is reported here unless the request is managed — see
 * {@link RequestOptions.managed} — and never when the caller cancelled it.
 *
 * @param queryFn Function that returns a Supabase query builder
 * @param errorConfig Configuration for error handling
 * @param request How the request is made; see {@link RequestOptions}
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
  request: RequestOptions = {},
): Promise<T> {
  return (await settle(queryFn, errorConfig, request)).data;
}

/**
 * {@link executeQuery} for a write made with `{ count: 'exact' }`: resolves to
 * how many rows it touched, without asking the server to send those rows back.
 */
export async function executeCountQuery(
  queryFn: () => PromiseLike<PostgrestSingleResponse<unknown>>,
  errorConfig: ErrorOptions = {},
  request: RequestOptions = {},
): Promise<number> {
  return (await settle(queryFn, errorConfig, request)).count ?? 0;
}

/** The success member of supabase-js's response union. */
type SucceededResponse<T> = Extract<PostgrestSingleResponse<T>, { error: null }>;

/** Runs the request; a success comes back as-is, a failure is reported (see above) and thrown. */
async function settle<T>(
  queryFn: () => PromiseLike<PostgrestSingleResponse<T>>,
  errorConfig: ErrorOptions,
  request: RequestOptions,
): Promise<SucceededResponse<T>> {
  const response = await queryFn();

  if (!response.error) return response;

  // Cancelled by its caller — a superseded refetch, a screen that left — which
  // is not a failure: nothing to report and nothing to retry. Our own 20 s
  // fetch deadline aborts a different signal (services/supabase.ts), so a
  // timed-out request still reports.
  request.signal?.throwIfAborted();

  if (request.managed) {
    throw new SupabaseRequestError(response.error, response.status, errorConfig);
  }

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
 * @param request How the request is made; see {@link RequestOptions}
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
  request: RequestOptions = {},
): Promise<T> {
  await checkAuthentication(userId);
  return executeQuery(queryFn, errorConfig, request);
}

/** A signal that never fires, for a request made without one. */
const NEVER_ABORTED = new AbortController().signal;

/**
 * The request's signal, or one that never fires — so a builder can always take
 * `.abortSignal()`, which accepts no `undefined`.
 */
export const signalOf = (request: RequestOptions): AbortSignal => request.signal ?? NEVER_ABORTED;

interface FetchAllPagesOptions {
  /** Each page's error config, or a function of the page's first row offset. */
  errorConfig?: ErrorOptions | ((from: number) => ErrorOptions);
  request?: RequestOptions;
  pageSize?: number;
  /** Runaway guard: stop after this many pages even when the last one was full. */
  maxPages?: number;
}

/**
 * Every row of a read, a page at a time.
 *
 * PostgREST truncates a response at {@link POSTGREST_MAX_ROWS} without saying
 * so, so a read that can outgrow it must page. Four services each wrote this
 * loop, and three of them paged without a unique order — which PostgreSQL does
 * not keep stable between requests: rows that tie on the sort key can move
 * across a page boundary between two page fetches, so a learner past 1000 words
 * or study days could get a word twice, lose one, or lose a streak day.
 *
 * So `fetchPage` must end its ordering on a UNIQUE key (`root_id` for a user's
 * study words, `id` for sentence rows), and apply `.range(from, to)` and
 * `.abortSignal(signal)`. Paging stops at the first short page, and before the
 * next one once the request's signal has fired.
 */
export async function fetchAllPages<Row>(
  fetchPage: (
    from: number,
    to: number,
    signal: AbortSignal,
  ) => PromiseLike<PostgrestSingleResponse<Row[]>>,
  {
    errorConfig = {},
    request = {},
    pageSize = POSTGREST_MAX_ROWS,
    maxPages = Infinity,
  }: FetchAllPagesOptions = {},
): Promise<Row[]> {
  const signal = signalOf(request);
  const rows: Row[] = [];

  for (let page = 0; page < maxPages; page++) {
    signal.throwIfAborted();
    const from = page * pageSize;
    const pageErrorConfig = typeof errorConfig === 'function' ? errorConfig(from) : errorConfig;
    const batch = await executeQuery(
      () => fetchPage(from, from + pageSize - 1, signal),
      pageErrorConfig,
      request,
    );
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}
