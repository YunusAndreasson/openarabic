'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { PlatformInfo } from '@/lib/platform-detection';
import { APP_NAME } from '@/lib/app';

interface SmartAppBannerProps {
  platformInfo: PlatformInfo;
}

const SESSION_STORAGE_KEY = 'app-banner-dismissed';
const BANNER_HEIGHT = 72;

// Routes where the banner should appear (exclude homepage since it has hero CTA)
const BANNER_ROUTES = ['/login', '/privacy', '/terms', '/contact'];
const shouldShowOnRoute = (path: string) =>
  BANNER_ROUTES.includes(path) ||
  path.startsWith('/read/') ||
  path.startsWith('/word/') ||
  path.startsWith('/author/');

// On iOS Safari the native apple-itunes-app Smart App Banner already shows, so
// the custom banner suppresses itself there to avoid a double banner. It still
// covers Android and non-Safari iOS browsers, where the native banner never appears.
const isIOSSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  return (
    isIOS &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|GSA|OPiOS|mercury/i.test(ua)
  );
};

export function SmartAppBanner({ platformInfo }: SmartAppBannerProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Early return if not mobile or wrong route
    if (!platformInfo.isMobile || !shouldShowOnRoute(pathname)) return;

    // Defer to the native iOS Safari Smart App Banner
    if (isIOSSafari()) return;

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
        }}
        role="banner"
        aria-label="Download OpenArabic mobile app"
      >
        <div className="bg-card/95 border-b border-border shadow-lg backdrop-blur-sm">
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
              <div className="font-semibold text-sm text-foreground">
                {APP_NAME}
              </div>
              <div className="text-xs text-muted-foreground">
                Master Arabic through reading
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="flex-shrink-0 px-4 py-2 bg-primary hover:bg-primary/85 active:bg-primary/70 text-primary-foreground text-sm font-medium rounded-lg transition-colors duration-150 shadow-sm touch-manipulation"
              aria-label={`Download from ${platformInfo.storeName}`}
            >
              Download
            </button>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors duration-150 touch-manipulation"
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
