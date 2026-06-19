import Image from 'next/image';
import type { PlatformInfo } from '@/lib/platform-detection';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app';

interface StoreBadgesProps {
  platformInfo: PlatformInfo;
  /** Force both badges (desktop / dedicated download page). */
  showBoth?: boolean;
  className?: string;
}

/**
 * Official App Store + Google Play badges (brand-guideline compliant artwork in
 * public/badges). The App Store badge swaps black→white in dark mode via the
 * `.dark` class. On mobile, only the badge for the user's platform is shown;
 * desktop / `showBoth` renders both so each store remains crawlable.
 *
 * Heights are normalized (App Store 2.5rem / Google Play 3rem) because Google's
 * artwork carries built-in padding — this makes the two badges optically equal.
 */
export function StoreBadges({
  platformInfo,
  showBoth = false,
  className,
}: StoreBadgesProps) {
  const showAppStore = showBoth || platformInfo.platform === 'ios';
  const showGooglePlay = showBoth || platformInfo.platform === 'android';

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}
    >
      {showAppStore && (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download OpenArabic on the App Store"
          className="inline-flex rounded-xl transition-opacity duration-150 hover:opacity-85 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {/* Light mode: black badge */}
          <Image
            src="/badges/app-store-black.svg"
            alt="Download on the App Store"
            width={120}
            height={40}
            className="block h-10 w-auto dark:hidden"
            priority
          />
          {/* Dark mode: white badge */}
          <Image
            src="/badges/app-store-white.svg"
            alt="Download on the App Store"
            width={120}
            height={40}
            className="hidden h-10 w-auto dark:block"
            priority
          />
        </a>
      )}

      {showGooglePlay && (
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get OpenArabic on Google Play"
          className="inline-flex rounded-xl transition-opacity duration-150 hover:opacity-85 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Image
            src="/badges/google-play.png"
            alt="Get it on Google Play"
            width={646}
            height={250}
            className="h-12 w-auto"
            priority
          />
        </a>
      )}
    </div>
  );
}
