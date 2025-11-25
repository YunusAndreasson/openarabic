'use client';

import { useEffect, useState } from 'react';
import type { PlatformInfo } from '@/lib/platform-detection';

const APP_STORE_URLS = {
  ios: 'https://apps.apple.com/ae/app/openarabic/id1594031029',
  android:
    'https://play.google.com/store/apps/details?id=com.edenmind.OpenArabic',
} as const;

/**
 * Client-side platform detection hook
 * Uses navigator.userAgent to detect iOS or Android devices
 * Returns platform info similar to server-side detectPlatform()
 */
export function usePlatformDetection(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    platform: 'desktop',
    isMobile: false,
    appStoreUrl: null,
    storeName: null,
  });

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent || '';

    // Detect iOS devices
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    // Detect Android devices
    const isAndroid = /Android/i.test(userAgent);

    // Determine platform
    let platform: PlatformInfo['platform'] = 'desktop';
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

    setPlatformInfo({
      platform,
      isMobile: isIOS || isAndroid,
      appStoreUrl,
      storeName,
    });
  }, []);

  return platformInfo;
}
