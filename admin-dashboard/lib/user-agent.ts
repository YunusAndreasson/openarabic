/**
 * Pure, edge-safe User-Agent classification. Kept separate from
 * platform-detection.ts (which pulls in next/headers and therefore can't run in
 * middleware) so middleware and Server Components share one source of truth for
 * device detection, bot detection, and the store-redirect decision.
 */
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app';

export type Platform = 'ios' | 'android' | 'desktop';

export interface PlatformInfo {
  platform: Platform;
  isMobile: boolean;
  appStoreUrl: string | null;
  storeName: string | null;
  /** UA looks like a crawler / link-preview fetcher (never store-redirect these). */
  isBot: boolean;
}

// Bots/crawlers/link-preview fetchers must NOT be redirected to a store: they
// need the page's HTML to index it and to build link previews. Googlebot's
// smartphone crawler carries an Android UA, so without this guard a store
// redirect would drop /download-app out of Google's mobile-first index.
const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|facebot|whatsapp|telegram|embedly|quora|pinterest|applebot|semrush|ahrefs|preview/i;

/** Classify a raw User-Agent string into platform + store info. */
export function classifyUserAgent(userAgent: string): PlatformInfo {
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  let platform: Platform = 'desktop';
  let appStoreUrl: string | null = null;
  let storeName: string | null = null;

  if (isIOS) {
    platform = 'ios';
    appStoreUrl = APP_STORE_URL;
    storeName = 'App Store';
  } else if (isAndroid) {
    platform = 'android';
    appStoreUrl = PLAY_STORE_URL;
    storeName = 'Google Play';
  }

  return {
    platform,
    isMobile: isIOS || isAndroid,
    appStoreUrl,
    storeName,
    isBot: BOT_UA.test(userAgent),
  };
}

/**
 * The store URL a real phone should be sent to, or null when we must NOT
 * redirect: desktop, unknown device, or any bot / crawler / link-preview
 * fetcher (those get the page's HTML instead).
 */
export function storeRedirectUrl(userAgent: string): string | null {
  const info = classifyUserAgent(userAgent);
  return info.isMobile && !info.isBot ? info.appStoreUrl : null;
}
