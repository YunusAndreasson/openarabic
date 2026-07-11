import { headers } from 'next/headers';
import type { PlatformInfo } from '@/lib/user-agent';
import { classifyUserAgent } from '@/lib/user-agent';

export type { Platform, PlatformInfo } from '@/lib/user-agent';

/**
 * Detects the user's platform from the User-Agent header.
 * Server-side only — uses Next.js headers(). For middleware / edge use, import
 * the pure classifier from @/lib/user-agent instead.
 */
export async function detectPlatform(): Promise<PlatformInfo> {
  const headersList = await headers();
  return classifyUserAgent(headersList.get('user-agent') || '');
}

/**
 * Get the appropriate app store URL for the user's platform.
 * Returns null if not on mobile.
 */
export async function getAppStoreUrl(): Promise<string | null> {
  const { appStoreUrl } = await detectPlatform();
  return appStoreUrl;
}

/**
 * Check if the user is on a mobile device.
 */
export async function isMobileDevice(): Promise<boolean> {
  const { isMobile } = await detectPlatform();
  return isMobile;
}
