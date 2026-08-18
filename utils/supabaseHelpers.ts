import type { PostgrestError } from '@supabase/supabase-js';

import { checkAuthentication } from '@/services/supabase';
import type { ErrorOptions } from '@/utils/errorHandling';
import { handleError } from '@/utils/errorHandling';

/**
 * Result type from Supabase queries
 */
interface SupabaseQueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Type for Supabase query builder (can be awaited to get result)
 */
type SupabaseQueryBuilder<T> = PromiseLike<SupabaseQueryResult<T>>;

/**
 * Executes a Supabase query with consistent error handling
 *
 * @param queryFn Function that returns a Supabase query builder
 * @param errorConfig Configuration for error handling
 * @returns The data from the query
 * @throws The error if the query fails (after logging and showing toast)
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
  queryFn: () => SupabaseQueryBuilder<T>,
  errorConfig: ErrorOptions = {},
): Promise<T> {
  const { data, error } = await queryFn();

  if (error) {
    // Forwarded whole rather than field-by-field: the seven-line copy this
    // replaced re-stated `sentrySeverity: ... || 'error'` and
    // `showToast: ... !== false`, both of which `handleError`'s own defaults
    // already apply — and silently dropped every option it hadn't been taught
    // about (`toastType`, `trackAnalytics`, `captureSentry`).
    await handleError(new Error(error.message), errorConfig);
    throw error;
  }

  return data as T;
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
  queryFn: () => SupabaseQueryBuilder<T>,
  errorConfig: ErrorOptions = {},
): Promise<T> {
  await checkAuthentication(userId);
  return executeQuery(queryFn, errorConfig);
}
