import { headers } from 'next/headers';

export type Platform = 'ios' | 'android' | 'desktop';

export interface PlatformInfo {
  platform: Platform;
  isMobile: boolean;
  appStoreUrl: string | null;
  storeName: string | null;
}

const APP_STORE_URLS = {
  ios: 'https://apps.apple.com/ae/app/openarabic/id1594031029',
  android:
    'https://play.google.com/store/apps/details?id=com.edenmind.OpenArabic',
} as const;

/**
 * Detects the user's platform from the User-Agent header
 * Server-side only - uses Next.js headers()
 */
export async function detectPlatform(): Promise<PlatformInfo> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';

  // Detect iOS devices
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  // Detect Android devices
  const isAndroid = /Android/i.test(userAgent);

  // Determine platform
  let platform: Platform = 'desktop';
  let appStoreUrl: string | null = null;
  let storeName: string | null = null;

  if (isIOS) {
    platform = 'ios';
    appStoreUrl = APP_STORE_URLS.ios;
    storeName = 'App Store';
  } else if (isAndroid) {
    platform = 'android';
    appStoreUrl = APP_STORE_URLS.android;
    storeName = 'Google Play';
  }

  return {
    platform,
    isMobile: isIOS || isAndroid,
    appStoreUrl,
    storeName,
  };
}

/**
 * Get the appropriate app store URL for the user's platform
 * Returns null if not on mobile
 */
export async function getAppStoreUrl(): Promise<string | null> {
  const { appStoreUrl } = await detectPlatform();
  return appStoreUrl;
}

/**
 * Check if the user is on a mobile device
 */
export async function isMobileDevice(): Promise<boolean> {
  const { isMobile } = await detectPlatform();
  return isMobile;
}
