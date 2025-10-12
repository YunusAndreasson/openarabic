import type { PostgrestError } from '@supabase/supabase-js';

import { checkAuthentication } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

/**
 * Configuration for error handling in Supabase queries
 */
export interface ErrorConfig {
  /** Custom toast message to show to the user */
  toastMessage?: string;
  /** Analytics event name for tracking */
  analyticsEventName?: string;
  /** Additional analytics properties */
  analyticsProperties?: Record<string, boolean | number | string>;
  /** Sentry severity level */
  sentrySeverity?: 'debug' | 'error' | 'fatal' | 'info' | 'warning';
  /** Sentry tags for categorization */
  sentryTags?: Record<string, string>;
  /** Sentry extra context */
  sentryExtra?: Record<string, unknown>;
  /** Whether to show toast to user (default: true) */
  showToast?: boolean;
}

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
  errorConfig: ErrorConfig = {}
): Promise<T> {
  const { data, error } = await queryFn();

  if (error) {
    await handleError(new Error(error.message), {
      toastMessage: errorConfig.toastMessage,
      analyticsEventName: errorConfig.analyticsEventName,
      analyticsProperties: errorConfig.analyticsProperties,
      sentrySeverity: errorConfig.sentrySeverity || 'error',
      sentryTags: errorConfig.sentryTags,
      sentryExtra: errorConfig.sentryExtra,
      showToast: errorConfig.showToast !== false, // Default to true
    });
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
  errorConfig: ErrorConfig = {}
): Promise<T> {
  await checkAuthentication(userId);
  return executeQuery(queryFn, errorConfig);
}
