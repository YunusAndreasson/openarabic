export const SUPABASE_URL = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';

/**
 * Hard ceiling on any single Supabase HTTP request.
 *
 * supabase-js sets no timeout, and React Native's fetch has none either, so a
 * request is bounded only by the OS TCP stack. After a network transition
 * (airplane mode, a tunnel, a handover) the pooled connections to the API host
 * are dead but still look open, and the next request queues on one and hangs.
 * Measured on device: a REST call issued on such a socket resolved after
 * **87.8 seconds**, while a request to a different host on the same device took
 * 366ms. It never errored — it just hung.
 *
 * That is worse than a failure, because React Query dedupes onto the in-flight
 * promise: for as long as it hangs, every retry, screen focus and post-session
 * invalidation is a no-op, so the practice counts and every graph silently
 * freeze at their last-good values, and grades queue behind a socket that may
 * never drain. A bounded request fails, which the query layer can retry and the
 * UI can report.
 *
 * Generous on purpose — this is a stuck-connection backstop, not a latency
 * budget. Normal calls finish in tens of milliseconds; the paged 1000-row
 * queries are the slow end and still land far inside it.
 */
export const SUPABASE_REQUEST_TIMEOUT_MS = 20_000;
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';
