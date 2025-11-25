'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { PlatformInfo } from '@/lib/platform-detection';

interface SmartAppBannerProps {
  platformInfo: PlatformInfo;
}

const SESSION_STORAGE_KEY = 'app-banner-dismissed';
const BANNER_HEIGHT = 72;

// Routes where the banner should appear (exclude homepage since it has hero CTA)
const BANNER_ROUTES = ['/login', '/privacy', '/terms', '/contact'];
const shouldShowOnRoute = (path: string) =>
  BANNER_ROUTES.includes(path) || path.startsWith('/read/');

export function SmartAppBanner({ platformInfo }: SmartAppBannerProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Early return if not mobile or wrong route
    if (!platformInfo.isMobile || !shouldShowOnRoute(pathname)) return;

    // Check session storage
    const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
    if (dismissed) return;

    // Show banner with animation delay
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [platformInfo.isMobile, pathname]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
  }, []);

  const handleDownload = useCallback(() => {
    if (platformInfo.appStoreUrl) {
      window.open(platformInfo.appStoreUrl, '_blank', 'noopener,noreferrer');
    }
  }, [platformInfo.appStoreUrl]);

  if (!platformInfo.isMobile || !shouldShowOnRoute(pathname) || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Banner */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ease-out"
        style={{
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          contain: 'layout style paint',
        }}
        role="banner"
        aria-label="Download OpenArabic mobile app"
      >
        <div className="bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 shadow-lg backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <Image
              src="/oaLogo.png"
              alt="OpenArabic"
              width={48}
              height={48}
              className="logo rounded-xl flex-shrink-0"
              loading="eager"
              priority
            />

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                OpenArabic
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Master Arabic through reading
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="flex-shrink-0 px-4 py-2 bg-primary hover:bg-primary/85 active:bg-primary/70 text-primary-foreground text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm touch-manipulation"
              aria-label={`Download from ${platformInfo.storeName}`}
            >
              Download
            </button>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 touch-manipulation"
              aria-label="Dismiss banner"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      {isVisible && (
        <div
          style={{ height: BANNER_HEIGHT }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
