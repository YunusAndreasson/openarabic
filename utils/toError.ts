/**
 * Turning a thrown `unknown` into an `Error` — dependency-free.
 *
 * Lives apart from `utils/errorHandling.ts` (which re-exports it) because that
 * module pulls in Sentry and analytics, and leaf modules such as
 * `lib/voice/recording.ts` need the conversion without dragging either into
 * their import graph.
 */

/** Upper bound on a synthesised error message, so one can never carry a payload. */
const MAX_THROWN_VALUE_LENGTH = 200;

/**
 * Describe a thrown non-Error WITHOUT serialising its contents.
 *
 * Serialising it is actively harmful: a rejected Supabase query once threw the
 * whole articles array, and `JSON.stringify`-ing it produced a ~100 KB "message".
 * Sentry then grouped on that text, so every distinct payload opened a BRAND NEW
 * issue whose title and stack frames were article JSON. Shape-only descriptions
 * keep such errors groupable and the payload out of the message.
 */
function describeThrownValue(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, MAX_THROWN_VALUE_LENGTH);
  if (value === null) return 'Non-Error thrown: null';
  if (value === undefined) return 'Non-Error thrown: undefined';
  if (Array.isArray(value)) return `Non-Error thrown: Array(${value.length})`;
  if (typeof value === 'object') {
    return `Non-Error thrown: ${value.constructor?.name ?? 'Object'}`;
  }
  // A function stringifies to its whole source text — exactly the unbounded
  // payload this helper exists to keep out of Sentry titles.
  if (typeof value === 'function') {
    return `Non-Error thrown: function ${value.name || 'anonymous'}`;
  }
  // Remaining primitives, narrowed explicitly so nothing can reach String()
  // that would render as "[object Object]".
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return `Non-Error thrown: ${typeof value} ${String(value).slice(0, MAX_THROWN_VALUE_LENGTH)}`;
  }
  if (typeof value === 'symbol') {
    return `Non-Error thrown: symbol ${value.toString().slice(0, MAX_THROWN_VALUE_LENGTH)}`;
  }
  return `Non-Error thrown: ${typeof value}`;
}

/**
 * Safely converts an unknown error to an Error object.
 * Useful for catch blocks where the error type is unknown.
 *
 * A plain string is treated as a deliberate message (many call sites pass one);
 * anything else non-Error is described by shape — see describeThrownValue.
 * `toError(err).message` is the one way to read a message off a caught value:
 * it replaces the hand-written `err instanceof Error ? err.message : String(err)`,
 * which turned a thrown array into its whole serialised payload.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  // Handle plain objects with a message property (e.g. Supabase error objects)
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return new Error(error.message.slice(0, MAX_THROWN_VALUE_LENGTH));
  }
  return new Error(describeThrownValue(error));
}
