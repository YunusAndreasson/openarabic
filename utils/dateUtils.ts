/**
 * Date utility functions for working with timestamps and date formatting
 */

/**
 * Parse Supabase timestamp strings into Date objects
 *
 * Supabase returns timestamps in various formats that need normalization
 * for reliable parsing in React Native (Hermes engine).
 *
 * @param ts - Timestamp string from Supabase (e.g., "2024-01-15 12:00:00+00" or "2024-01-15T12:00:00Z")
 * @returns Parsed Date object or null if invalid
 *
 * @example
 * ```ts
 * const date = parseSupabaseTimestamp("2024-01-15 12:00:00+00");
 * // Returns: Date object for 2024-01-15 12:00:00 UTC
 *
 * const invalid = parseSupabaseTimestamp(null);
 * // Returns: null
 * ```
 */
export function parseSupabaseTimestamp(ts: string | null | undefined): Date | null {
  if (!ts) return null;

  // Normalize timestamp format for consistent parsing
  let normalized = ts.replace(' ', 'T'); // Space to ISO 8601 format

  // Normalize timezone: convert trailing "+00" to "Z"
  normalized = normalized.replace(/\+00$/, 'Z');

  // If no timezone info, assume UTC
  if (!/[Zz]|[-+]\d{2}:?\d{2}$/.test(normalized)) {
    normalized = normalized + 'Z';
  }

  const date = new Date(normalized);

  // Return null if parsing resulted in invalid date
  return isNaN(date.getTime()) ? null : date;
}
