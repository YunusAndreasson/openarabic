import { APP_STORE_ID } from '@/lib/app';

/**
 * The App Store rating, read from Apple rather than written down here.
 *
 * Ratings are per storefront and this reads the US one, so the display says so.
 * The count is left out of the page on purpose (owner decision, 2026-10-31), which
 * is also why this must never feed `aggregateRating` in JSON-LD: that requires one.
 */
const LOOKUP_URL = `https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us`;

const LOOKUP_TIMEOUT_MS = 1500;
const CACHE_MS = 6 * 60 * 60 * 1000;
const CACHE_FAILURE_MS = 5 * 60 * 1000;

// The Worker's incremental cache is a no-op ('dummy' in open-next.config.ts), so
// Next's fetch cache wouldn't persist. Held per isolate instead, so a slow Apple
// can't hold up every render, a failure included.
let cached: { rating: number | null; expires: number } | null = null;

export function parseAppRating(lookup: unknown): number | null {
  const result = (lookup as { results?: { averageUserRating?: unknown; userRatingCount?: unknown }[] })
    ?.results?.[0];
  const rating = result?.averageUserRating;
  const count = result?.userRatingCount;

  if (typeof rating !== 'number' || rating <= 0 || rating > 5) return null;
  if (typeof count !== 'number' || count <= 0) return null;
  return rating;
}

/** Resolves to null on any failure, and callers then render no rating at all. */
export async function getAppRating(): Promise<number | null> {
  if (cached && cached.expires > Date.now()) return cached.rating;

  let rating: number | null = null;
  try {
    const response = await fetch(LOOKUP_URL, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
    if (response.ok) rating = parseAppRating(await response.json());
  } catch {
    // Slow or unreachable: no rating is better than a stale or invented one.
  }

  cached = { rating, expires: Date.now() + (rating === null ? CACHE_FAILURE_MS : CACHE_MS) };
  return rating;
}
