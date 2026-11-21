/**
 * Telling "no answer came back" apart from "the request failed".
 *
 * A request made with no usable connection (offline, cellular data switched off
 * for the app, a DNS failure, a stalled socket cut off by a deadline, a
 * cancelled transfer) fails without the server ever having been asked. No build
 * fixes that, so it is not a Sentry issue: `handleError` leaves it on the
 * breadcrumb trail and shows the connection toast, and the Sentry gate in
 * `app/_layout.tsx` drops it on the paths that capture around `handleError`.
 *
 * Anything that carries an HTTP status is out by definition: the server
 * answered, and a 4xx or 5xx is a real failure, however it is worded.
 *
 * Dependency-free, like `utils/toError.ts`, so the error handler, the Sentry
 * gate and the audio player can all share it.
 */

/** Error names that only ever mean the request was cut short. */
const NETWORK_FAILURE_NAMES: ReadonlySet<string> = new Set([
  // A cancelled or timed-out transfer: AbortSignal, expo-file-system's
  // download timeout ("The operation was aborted.").
  'AbortError',
  // AbortSignal.timeout(), and the Supabase request deadline (services/supabase.ts).
  'TimeoutError',
  // supabase-js auth, when fetch itself rejected (status 0). The same class
  // carries a 5xx too, and that one is excluded by its status below.
  'AuthRetryableFetchError',
]);

/**
 * What the platform networking stacks say when no answer came, lowercased.
 *
 * Matched as substrings because every layer wraps the one below: postgrest-js
 * prefixes the error name, expo/fetch "fetch failed:", ExpoModulesCore
 * "UnexpectedException:" (OPENARABIC-NV reads "Error: fetch failed:
 * UnexpectedException: A data connection is not currently allowed.").
 */
const NETWORK_FAILURE_MESSAGES: readonly string[] = [
  // iOS, NSURLError's own descriptions
  'a data connection is not currently allowed', // -1020: cellular data off for the app
  'the internet connection appears to be offline', // -1009
  'the network connection was lost', // -1005
  'request timed out', // -1001 "The request timed out.", and our own deadline
  'could not connect to the server', // -1004
  'a server with the specified hostname could not be found', // -1003
  'international roaming is currently off', // -1018
  // Android, java.net and OkHttp
  'unable to resolve host', // UnknownHostException: DNS, no connection
  'unknownhostexception',
  'sockettimeoutexception',
  'interruptedioexception', // OkHttp's call timeout
  'connect timed out',
  'read timed out',
  'connectexception',
  'failed to connect to',
  'noroutetohostexception',
  'software caused connection abort', // the network switched under the socket
  'connection reset',
  'unexpected end of stream',
  // expo/fetch: the native request was cancelled (a deadline or a caller's abort)
  'fetch request has been canceled',
  // React Native's own fetch
  'network request failed',
  // AbortSignal, everywhere
  'the operation was aborted',
  // this app's own offline pre-flights (audio cache, Google sign-in retry)
  'no network connection available',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Whether `error` is a request that never got an answer — see the file header.
 *
 * Takes the raw thrown value: an Error, a supabase-js error object, or a string.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof error === 'string') return matchesNetworkMessage(error);
  if (!isRecord(error)) return false;

  // The server answered. SupabaseRequestError and supabase-js's auth errors
  // carry 0 when no response came, so 0 still counts as unanswered.
  const { status, name, message } = error;
  if (typeof status === 'number' && status !== 0) return false;

  if (typeof name === 'string' && NETWORK_FAILURE_NAMES.has(name)) return true;
  return typeof message === 'string' && matchesNetworkMessage(message);
}

function matchesNetworkMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return NETWORK_FAILURE_MESSAGES.some(pattern => lowered.includes(pattern));
}
