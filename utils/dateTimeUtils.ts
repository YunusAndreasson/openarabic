/**
 * Date and time utility functions for formatting and safe calculations
 * Combines date parsing (Supabase timestamps) and time formatting utilities
 */

export const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

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
  if (typeof ts !== 'string') return undefined;

  // Space separator → ISO 8601 'T'.
  let normalized = ts.replace(' ', 'T');

  // Postgres renders a whole-hour UTC offset as "+00" (or "+02"). That is
  // valid Postgres output but not valid ISO 8601, and swapping the space for a
  // 'T' actively breaks it: "2026-08-09 12:00:00+00" parses in V8's legacy
  // parser, while "2026-08-09T12:00:00+00" is NaN in both V8 and Hermes. Every
  // consumer of this helper reads NaN as "not due", so the failure is silent —
  // widen the offset instead.
  if (normalized.includes('T')) {
    normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
  }

  // No offset at all (a `timestamp without time zone` column, or a bare
  // date): the value is UTC on the wire, and without the marker the runtime
  // reads it as device-local — shifting every derived age by the device offset.
  if (!/[Zz]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  return normalized;
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

  // One normalization for both helpers, so a stamp can never mean one thing to
  // the code that counts due words and another to the code that charts them.
  const normalized = normalizeTimestamp(ts);
  if (!normalized) return null;

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

/** Format a local hour/minute pair with the app's consistent 24-hour clock. */
export function format24HourTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
 * Converts a date to a LOCAL calendar date string (YYYY-MM-DD format).
 *
 * "Which day did I study?" is a question about the learner's own calendar, not
 * about UTC. Keying streaks by UTC day means an evening session west of UTC
 * lands on tomorrow and a late-night session east of UTC lands on yesterday —
 * so two sessions on consecutive local days can collapse into one UTC day (or
 * straddle a UTC day with nothing in it) and silently break a streak.
 *
 * This is also the day boundary `countReviewedToday` uses, so the streak and
 * the "N reviewed today" line on the same card agree about what "today" means.
 *
 * @param date - Date to convert
 * @returns Local date string in YYYY-MM-DD format
 *
 * @example
 * ```ts
 * const dateStr = toLocalDateString(new Date());
 * // Returns: "2024-01-15" (the date on the device's own calendar)
 * ```
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
