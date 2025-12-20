/**
 * Date and time utility functions for formatting and safe calculations
 * Combines date parsing (Supabase timestamps) and time formatting utilities
 */

/**
 * Normalize Supabase timestamp string format for Date.parse()
 * Converts space-separated timestamp to ISO 8601 T-separator format
 *
 * This is a minimal normalization used throughout the FSRS system for
 * quick timestamp parsing. For more robust parsing, use parseSupabaseTimestamp().
 *
 * @param ts - Timestamp string from Supabase (e.g., "2024-01-15 12:00:00")
 * @returns Normalized timestamp string with T-separator, or undefined if null
 *
 * @example
 * ```ts
 * const normalized = normalizeTimestamp("2024-01-15 12:00:00");
 * // Returns: "2024-01-15T12:00:00"
 *
 * const ms = Date.parse(normalizeTimestamp(timestamp) ?? '');
 * ```
 */
export function normalizeTimestamp(ts: string | null | undefined): string | undefined {
  if (typeof ts === 'string') return ts.replace(' ', 'T');
  return undefined;
}

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
    normalized = `${normalized}Z`;
  }

  const date = new Date(normalized);

  // Return null if parsing resulted in invalid date
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Format seconds to M:SS (e.g., 1:05)
 */
export function formatSecondsToClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a Date to 12-hour clock string using native toLocaleTimeString
 * Returns format like "2:30 PM" in US locale
 */
export function formatDateTo12hClock(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Safely compute a percentage (0-100) from position and duration.
 */
export function safePercent(position: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(position) || position < 0) return 0;
  const pct = (position / duration) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Converts a date to UTC date string (YYYY-MM-DD format).
 * Used for streak tracking and calendar data where we need consistent UTC date strings.
 *
 * @param date - Date to convert
 * @returns UTC date string in YYYY-MM-DD format
 *
 * @example
 * ```ts
 * const dateStr = toUTCDateString(new Date());
 * // Returns: "2024-01-15" (UTC date, regardless of local timezone)
 * ```
 */
export function toUTCDateString(date: Date): string {
  return (
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
      .toISOString()
      .split('T')[0] || ''
  );
}

/**
 * Generates an array of future dates for forecasting.
 * Used by FSRS charts for due word predictions.
 *
 * @param days - Number of days in the future to generate
 * @returns Array of Date objects from today to days in the future
 *
 * @example
 * ```ts
 * const forecast = generateFutureDateRange(7);
 * // Returns: [today, tomorrow, ..., 7 days from now]
 * ```
 */
export function generateFutureDateRange(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();

  for (let i = 0; i <= days; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    dates.push(futureDate);
  }

  return dates;
}

/**
 * Generates an array of past dates for historical analysis.
 * Used by study streak charts.
 *
 * @param days - Number of days in the past to generate
 * @returns Array of Date objects from days ago to today
 *
 * @example
 * ```ts
 * const history = generatePastDateRange(7);
 * // Returns: [7 days ago, 6 days ago, ..., today]
 * ```
 */
export function generatePastDateRange(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - i);
    dates.push(pastDate);
  }

  return dates;
}
